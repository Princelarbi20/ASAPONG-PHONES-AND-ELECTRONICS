import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { EmailOutbox } from '../modules/emailOutbox.js';
import { Register } from '../modules/userRegister.js';
import sendEmail from './nodemailer.js';

const MAX_ATTEMPTS = 5;
const retryDelayMs = [15_000, 30_000, 60_000, 120_000, 300_000];
let processing = false;

const encryptionKey = () => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error('REFRESH_TOKEN_SECRET must be set to protect queued email payloads.');
  return createHmac('sha256', secret).update('asapong-otp-outbox-v1').digest();
};

const encryptPayload = (payload) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${ciphertext.toString('base64')}`;
};

const decryptPayload = (encrypted) => {
  const [iv, tag, ciphertext] = encrypted.split('.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8'));
};

export const enqueueOtpEmail = async ({ requestId, userId, otpVersion, message }) => EmailOutbox.create({
  requestId,
  userId,
  otpVersion,
  encryptedPayload: encryptPayload(message),
});

export const processEmailOutbox = async () => {
  if (processing) return;
  processing = true;
  try {
    const staleLock = new Date(Date.now() - 120_000);
    await EmailOutbox.updateMany({ status: 'sending', lockedAt: { $lt: staleLock } }, { $set: { status: 'pending', lockedAt: null } });
    const job = await EmailOutbox.findOneAndUpdate(
      { status: 'pending', attempts: { $lt: MAX_ATTEMPTS }, nextAttemptAt: { $lte: new Date() } },
      { $set: { status: 'sending', lockedAt: new Date() }, $inc: { attempts: 1 } },
      { new: true, sort: { createdAt: 1 } },
    ).select('+encryptedPayload');
    if (!job) return;

    const user = await Register.findById(job.userId).select('+otpVersion');
    if (!user || user.isVerified || user.otpVersion !== job.otpVersion || !user.otpExpires || user.otpExpires <= new Date()) {
      await EmailOutbox.updateOne({ _id: job._id }, { $set: { status: 'failed', lastErrorCode: 'stale_or_expired_otp', lockedAt: null }, $unset: { encryptedPayload: 1 } });
      return;
    }

    const deliveryStartedAt = Date.now();
    const result = await sendEmail(decryptPayload(job.encryptedPayload));
    if (!result?.success) {
      const attempts = job.attempts;
      const terminal = attempts >= MAX_ATTEMPTS;
      const failureUpdate = { $set: {
        status: terminal ? 'failed' : 'pending',
        lockedAt: null,
        lastErrorCode: result?.error?.code || 'delivery_not_accepted',
        nextAttemptAt: new Date(Date.now() + retryDelayMs[Math.min(attempts - 1, retryDelayMs.length - 1)]),
      } };
      if (terminal) failureUpdate.$unset = { encryptedPayload: 1 };
      await EmailOutbox.updateOne({ _id: job._id }, failureUpdate);
      console.error('[email-outbox] delivery_failed', JSON.stringify({ requestId: job.requestId, attempt: attempts, terminal, durationMs: Date.now() - deliveryStartedAt, errorCode: result?.error?.code || null }));
      return;
    }

    await EmailOutbox.updateOne({ _id: job._id }, { $set: { status: 'sent', sentAt: new Date(), lockedAt: null }, $unset: { encryptedPayload: 1, lastErrorCode: 1 } });
    console.info('[email-outbox] delivery_accepted', JSON.stringify({ requestId: job.requestId, durationMs: Date.now() - deliveryStartedAt }));
  } catch (error) {
    console.error('[email-outbox] worker_error', JSON.stringify({ errorName: error?.name, errorCode: error?.code }));
  } finally {
    processing = false;
  }
};

export const startEmailOutboxWorker = () => {
  const timer = setInterval(processEmailOutbox, 2_000);
  timer.unref?.();
  void processEmailOutbox();
};
