import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { OrderNotificationOutbox } from '../modules/orderNotificationOutbox.js';
import { Orders } from '../modules/orderSchema.js';
import { buildCashOnDeliveryOrderEmail, buildPaymentConfirmationEmail } from './orderEmail.js';
import { buildOrderStatusEmail } from './orderStatusEmail.js';
import sendEmail from './emailTransport.js';

const MAX_ATTEMPTS = 8;
const RETRY_DELAYS_MS = [15_000, 30_000, 60_000, 120_000, 300_000, 600_000, 1_800_000, 3_600_000];
let processing = false;
let workerStarted = false;

const encryptionKey = () => {
  const secret = process.env.EMAIL_OUTBOX_ENCRYPTION_SECRET || process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error('An email outbox encryption secret is not configured.');
  return createHmac('sha256', secret).update('asapong-order-notification-outbox-v1').digest();
};

const encrypt = (payload) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${ciphertext.toString('base64')}`;
};

const decrypt = (value) => {
  const [iv, tag, ciphertext] = String(value || '').split('.');
  if (!iv || !tag || !ciphertext) throw new Error('Encrypted notification payload is malformed.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const cleartext = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]);
  return JSON.parse(cleartext.toString('utf8'));
};

export const enqueueOrderNotification = async ({ orderId, eventKey, type, data = {}, session } = {}) => {
  if (!orderId || typeof eventKey !== 'string' || !eventKey.trim()) throw new Error('Order notification requires an order and stable event key.');
  if (!['COD_CONFIRMATION', 'PAYMENT_CONFIRMATION', 'STATUS_UPDATE'].includes(type)) throw new Error('Unsupported order notification type.');

  const notification = await OrderNotificationOutbox.findOneAndUpdate(
    { eventKey },
    { $setOnInsert: { order: orderId, eventKey, type, encryptedPayload: encrypt(data) } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true, ...(session ? { session } : {}) },
  );
  return notification;
};

const getMessage = (type, order, data) => {
  if (type === 'COD_CONFIRMATION') return buildCashOnDeliveryOrderEmail(order);
  if (type === 'PAYMENT_CONFIRMATION') return buildPaymentConfirmationEmail(order, data);
  return buildOrderStatusEmail({ order, previousStatus: data.previousStatus, newStatus: data.newStatus });
};

const markFailed = (job, { errorCode, permanent = false } = {}) => {
  const terminal = permanent || job.attempts >= MAX_ATTEMPTS;
  const retryDelay = RETRY_DELAYS_MS[Math.min(Math.max(job.attempts - 1, 0), RETRY_DELAYS_MS.length - 1)];
  const update = {
    $set: {
      status: terminal ? 'failed' : 'pending',
      lockedAt: null,
      lastErrorCode: String(errorCode || 'notification_delivery_failed').slice(0, 100),
      ...(terminal ? {} : { nextAttemptAt: new Date(Date.now() + retryDelay) }),
    },
  };
  if (terminal) update.$unset = { encryptedPayload: 1 };
  return OrderNotificationOutbox.updateOne({ _id: job._id, status: 'sending' }, update);
};

export const processOrderNotificationOutbox = async ({ send = sendEmail } = {}) => {
  if (processing) return false;
  processing = true;
  let job;
  try {
    await OrderNotificationOutbox.updateMany(
      { status: 'sending', lockedAt: { $lt: new Date(Date.now() - 120_000) } },
      { $set: { status: 'pending', lockedAt: null } },
    );

    job = await OrderNotificationOutbox.findOneAndUpdate(
      { status: 'pending', attempts: { $lt: MAX_ATTEMPTS }, nextAttemptAt: { $lte: new Date() } },
      { $set: { status: 'sending', lockedAt: new Date() }, $inc: { attempts: 1 } },
      { returnDocument: 'after', sort: { createdAt: 1 } },
    ).select('+encryptedPayload');
    if (!job) return false;

    const order = await Orders.findById(job.order).populate('user', 'userName email');
    if (!order) {
      await markFailed(job, { errorCode: 'order_not_found', permanent: true });
      console.error('[order-email] failed', JSON.stringify({ eventKey: job.eventKey, code: 'order_not_found' }));
      return true;
    }

    const recipient = order.user?.email || order.customerEmail;
    const data = decrypt(job.encryptedPayload);
    const email = getMessage(job.type, order, data);
    const result = await send({
      to: recipient,
      ...email,
      headers: { 'Message-ID': `<${Buffer.from(job.eventKey).toString('hex')}@asapong-phones.local>` },
    });

    if (!result?.success) {
      const code = result?.error?.code || 'gmail_send_failed';
      const statusCode = result?.error?.statusCode;
      const permanent = code === 'invalid_recipient' || (statusCode >= 400 && statusCode < 500 && statusCode !== 429);
      await markFailed(job, { errorCode: code, permanent });
      console.error('[order-email] delivery_failed', JSON.stringify({
        eventKey: job.eventKey,
        attempt: job.attempts,
        terminal: permanent || job.attempts >= MAX_ATTEMPTS,
        errorCode: code,
      }));
      return true;
    }

    await OrderNotificationOutbox.updateOne(
      { _id: job._id, status: 'sending' },
      {
        $set: { status: 'sent', sentAt: new Date(), lockedAt: null, providerMessageId: result.messageId },
        $unset: { encryptedPayload: 1, lastErrorCode: 1 },
      },
    );
    console.info('[order-email] delivery_accepted', JSON.stringify({ eventKey: job.eventKey, messageId: result.messageId }));
    return true;
  } catch (error) {
    if (job) {
      try { await markFailed(job, { errorCode: error?.code || error?.name || 'notification_worker_error' }); }
      catch (updateError) {
        console.error('[order-email] state_update_failed', JSON.stringify({ eventKey: job.eventKey, errorCode: updateError?.code || updateError?.name }));
      }
    }
    console.error('[order-email] worker_error', JSON.stringify({ eventKey: job?.eventKey, errorCode: error?.code || error?.name }));
    return false;
  } finally {
    processing = false;
  }
};

export const reconcileMissingOrderNotifications = async ({ batchSize = 100 } = {}) => {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const candidates = await Orders.find({
    createdAt: { $gte: cutoff },
    $or: [
      { paymentMethod: 'COD' },
      { paymentStatus: 'PAID' },
    ],
  }).sort({ createdAt: -1, _id: -1 }).limit(batchSize).select('_id orderNumber paymentMethod paymentStatus paymentDetails');

  for (const order of candidates) {
    try {
      if (order.paymentMethod === 'COD') {
        await enqueueOrderNotification({ orderId: order._id, eventKey: `order:${order._id}:cod-confirmation`, type: 'COD_CONFIRMATION' });
      }
      if (order.paymentStatus === 'PAID') {
        await enqueueOrderNotification({
          orderId: order._id,
          eventKey: `order:${order._id}:payment-confirmation`,
          type: 'PAYMENT_CONFIRMATION',
          data: {
            reference: order.paymentDetails?.reference,
            amount: order.paymentDetails?.amount,
            paymentMethod: order.paymentDetails?.channel || order.paymentDetails?.provider || 'Paystack',
          },
        });
      }
    } catch (error) {
      console.error('[order-email] recovery_enqueue_failed', JSON.stringify({ orderId: String(order._id), errorCode: error?.code || error?.name }));
    }
  }
  return candidates.length;
};

export const startOrderNotificationWorker = ({ intervalMs = 2_000 } = {}) => {
  if (workerStarted) return;
  workerStarted = true;
  const timer = setInterval(async () => {
    try {
      await processOrderNotificationOutbox();
      if (Date.now() % 60_000 < intervalMs) await reconcileMissingOrderNotifications();
    } catch (error) {
      console.error('[order-email] polling_failed', error?.code || error?.name);
    }
  }, intervalMs);
  timer.unref?.();
  void processOrderNotificationOutbox();
};
