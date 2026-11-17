import { PaystackRefund } from '../modules/paystackRefundSchema.js';
import { PaymentAttempt } from '../modules/paymentAttemptSchema.js';
import { Orders } from '../modules/orderSchema.js';
import { CACHE_NAMESPACES, invalidateCacheNamespaces } from './responseCache.js';
import { PAYSTACK_REFUND_RECONCILIATION_INTERVAL_MS } from '../config/orderLifecycle.js';

const getPaystackBaseUrl = () => String(process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co').replace(/\/+$/, '');
const statusMap = new Map([
  ['pending', 'PENDING'],
  ['processing', 'PROCESSING'],
  ['processed', 'PROCESSED'],
  ['failed', 'FAILED'],
  ['needs-attention', 'NEEDS_ATTENTION'],
  ['needs_attention', 'NEEDS_ATTENTION'],
]);

const paystackRequest = async (path, { method = 'GET', body } = {}) => {
  const response = await fetch(`${getPaystackBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10_000),
  });
  let payload;
  try { payload = await response.json(); }
  catch { payload = {}; }
  return { response, payload };
};

const mapRefundStatus = (providerStatus) => statusMap.get(String(providerStatus || '').toLowerCase()) || null;

const findProviderRefund = async (reference) => {
  const { response, payload } = await paystackRequest(`/refund?reference=${encodeURIComponent(reference)}`);
  if (!response.ok || !payload.status || !Array.isArray(payload.data)) return null;
  return payload.data.find((item) => String(item.reference || '').toLowerCase() === reference.toLowerCase()) || null;
};

const applyProviderRefundState = async (refund, providerRefund) => {
  if (!providerRefund || String(providerRefund.reference || '').toLowerCase() !== refund.reference.toLowerCase()) return refund;
  const status = mapRefundStatus(providerRefund.status);
  if (!status) return refund;
  let orderWasReversed = false;
  if (status === 'PROCESSED' && refund.reason === 'ADMIN_REQUEST') {
    const order = await Orders.findOneAndUpdate(
      { _id: refund.order, paymentStatus: 'PAID', status: { $nin: ['CANCELLED', 'EXPIRED'] } },
      { $set: { paymentStatus: 'REVERSED' } },
      { new: true, runValidators: true },
    );
    orderWasReversed = Boolean(order);
  }

  const updated = await PaystackRefund.findByIdAndUpdate(refund._id, {
    $set: {
      status,
      providerStatus: String(providerRefund.status),
      providerRefundId: providerRefund.id == null ? undefined : String(providerRefund.id),
      providerResponse: String(providerRefund.merchant_note || providerRefund.customer_note || '').slice(0, 1000),
      lastCheckedAt: new Date(),
      ...(status === 'PROCESSED' ? { processedAt: providerRefund.refunded_at ? new Date(providerRefund.refunded_at) : new Date() } : {}),
    },
  }, { new: true, runValidators: true });

  await PaymentAttempt.findByIdAndUpdate(refund.paymentAttempt, {
    $set: {
      refundStatus: status,
      refundReference: refund.reference,
      ...(status === 'PROCESSED' ? { status: 'REFUNDED', refundedAt: updated.processedAt } : {}),
    },
  });

  if (orderWasReversed) await invalidateCacheNamespaces(CACHE_NAMESPACES.adminOrders, CACHE_NAMESPACES.userOrders);
  return updated || refund;
};

export const getOrCreatePaystackRefund = async ({ order, paymentAttempt, amountSubunits, currency, reason }) => {
  const amount = Number(amountSubunits);
  const normalizedCurrency = String(currency || '').toUpperCase();
  if (!order?._id || !paymentAttempt?._id || !paymentAttempt.reference || !paymentAttempt.transactionId) {
    throw new Error('Refund requires a saved Paystack attempt with a transaction ID.');
  }
  if (!Number.isSafeInteger(amount) || amount < 1 || !/^[A-Z]{3}$/.test(normalizedCurrency)) {
    throw new Error('Verified payment amount or currency is invalid for refund processing.');
  }

  const reference = `rfd_${String(paymentAttempt._id)}`;
  let refund;
  try {
    refund = await PaystackRefund.findOneAndUpdate(
      { paymentAttempt: paymentAttempt._id },
      {
        $setOnInsert: {
          order: order._id,
          transactionReference: paymentAttempt.reference,
          transactionId: paymentAttempt.transactionId,
          reference,
          amount,
          currency: normalizedCurrency,
          reason,
          status: 'REQUESTED',
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
    refund = await PaystackRefund.findOne({ paymentAttempt: paymentAttempt._id });
  }
  if (!refund) throw new Error('Could not persist the idempotent Paystack refund request.');

  await PaymentAttempt.findByIdAndUpdate(paymentAttempt._id, {
    $set: { refundStatus: refund.status, refundReference: refund.reference },
  });
  return refund;
};

export const processPaystackRefund = async (refundId) => {
  const refund = await PaystackRefund.findById(refundId);
  if (!refund || ['PROCESSED', 'FAILED', 'NEEDS_ATTENTION'].includes(refund.status)) return refund;

  let existing = await findProviderRefund(refund.reference);
  if (existing) return applyProviderRefundState(refund, existing);

  const { response, payload } = await paystackRequest('/refund', {
    method: 'POST',
    body: {
      transaction: refund.transactionId,
      amount: refund.amount,
      currency: refund.currency,
      reference: refund.reference,
      merchant_note: `Order ${refund.order}: ${refund.reason}`,
    },
  });

  if (response.status === 409) {
    existing = await findProviderRefund(refund.reference);
    if (existing) return applyProviderRefundState(refund, existing);
    return refund;
  }

  if (!response.ok || !payload.status || !payload.data) {
    if (response.status >= 400 && response.status < 500) {
      const failed = await PaystackRefund.findByIdAndUpdate(refund._id, {
        $set: {
          status: 'FAILED',
          providerStatus: 'failed',
          providerResponse: String(payload.message || 'Paystack rejected the refund request.').slice(0, 1000),
          lastCheckedAt: new Date(),
        },
      }, { new: true });
      await PaymentAttempt.findByIdAndUpdate(refund.paymentAttempt, { $set: { refundStatus: 'FAILED' } });
      return failed;
    }
    return refund;
  }

  return applyProviderRefundState(refund, payload.data);
};

export const requestPaystackRefund = async (args, { processNow = true } = {}) => {
  const refund = await getOrCreatePaystackRefund(args);
  if (!processNow || ['PROCESSED', 'FAILED', 'NEEDS_ATTENTION'].includes(refund.status)) return refund;
  try {
    return await processPaystackRefund(refund._id);
  } catch (error) {
    console.error('[payments] refund submission deferred', JSON.stringify({
      refundId: String(refund._id),
      errorName: error?.name,
      errorCode: error?.code,
    }));
    return refund;
  }
};

export const reconcilePaystackRefund = async (reference) => {
  const refund = await PaystackRefund.findOne({ reference });
  if (!refund) return null;
  const providerRefund = await findProviderRefund(refund.reference);
  return providerRefund ? applyProviderRefundState(refund, providerRefund) : refund;
};

export const reconcilePendingPaystackRefunds = async ({ batchSize = 50 } = {}) => {
  const refunds = await PaystackRefund.find({ status: { $in: ['REQUESTED', 'PENDING', 'PROCESSING'] } })
    .sort({ updatedAt: 1, _id: 1 }).limit(batchSize).select('_id').lean();
  for (const refund of refunds) {
    try { await processPaystackRefund(refund._id); }
    catch (error) {
      console.error('[payments] refund reconciliation deferred', JSON.stringify({
        refundId: String(refund._id), errorName: error?.name, errorCode: error?.code,
      }));
    }
  }
  return refunds.length;
};

let refundWorkerStarted = false;
export const startPaystackRefundWorker = ({ intervalMs = PAYSTACK_REFUND_RECONCILIATION_INTERVAL_MS } = {}) => {
  if (refundWorkerStarted) return;
  refundWorkerStarted = true;
  const schedule = () => {
    const timer = setTimeout(async () => {
      try { await reconcilePendingPaystackRefunds(); }
      catch (error) { console.error('[payments] refund reconciliation scan failed', error?.code || error?.name); }
      finally { schedule(); }
    }, intervalMs);
    timer.unref?.();
  };
  void reconcilePendingPaystackRefunds().catch((error) => {
    console.error('[payments] initial refund reconciliation failed', error?.code || error?.name);
  }).finally(schedule);
};
