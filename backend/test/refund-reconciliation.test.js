import test from 'node:test';
import assert from 'node:assert/strict';
import { PaystackRefund } from '../modules/paystackRefundSchema.js';
import { PaymentAttempt } from '../modules/paymentAttemptSchema.js';
import { Orders } from '../modules/orderSchema.js';
import { getOrCreatePaystackRefund, processPaystackRefund } from '../utils/paystackRefunds.js';

const stub = (t, object, key, implementation) => {
  const original = object[key];
  object[key] = implementation;
  t.after(() => { object[key] = original; });
};

test('refund records are idempotent per verified payment attempt', async (t) => {
  let persisted;
  let writes = 0;
  stub(t, PaystackRefund, 'findOneAndUpdate', async (filter, update) => {
    writes += 1;
    assert.equal(String(filter.paymentAttempt), 'attempt-1');
    persisted ||= { _id: 'refund-doc-1', ...update.$setOnInsert };
    return persisted;
  });
  stub(t, PaymentAttempt, 'findByIdAndUpdate', async () => ({}));

  const args = {
    order: { _id: 'order-1' },
    paymentAttempt: { _id: 'attempt-1', reference: 'pay-ref-123456', transactionId: '123' },
    amountSubunits: 2500,
    currency: 'GHS',
    reason: 'LATE_PAYMENT',
  };
  const first = await getOrCreatePaystackRefund(args);
  const second = await getOrCreatePaystackRefund(args);
  assert.equal(first.reference, second.reference);
  assert.equal(first.reference, 'rfd_attempt-1');
  assert.equal(writes, 2, 'both invocations upsert the same unique attempt key');
});

test('refund remains pending until Paystack verifies processed status and is never submitted twice', async (t) => {
  const refund = {
    _id: 'refund-doc-2', order: 'order-2', paymentAttempt: 'attempt-2',
    transactionId: '124', transactionReference: 'pay-ref-223456',
    reference: 'rfd_attempt-2', amount: 2500, currency: 'GHS',
    reason: 'EXPIRED_ORDER', status: 'REQUESTED',
  };
  let currentRefund = { ...refund };
  let providerStatus = 'pending';
  let providerExists = false;
  let postCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options = {}) => {
    if (options.method === 'POST') { postCount += 1; providerExists = true; }
    const data = options.method === 'POST'
      ? { reference: refund.reference, status: 'pending', id: 987 }
      : { reference: refund.reference, status: providerStatus, id: 987, refunded_at: '2026-11-16T12:00:00Z' };
    return { ok: true, status: 200, json: async () => ({ status: true, data: options.method === 'POST' ? data : providerExists ? [data] : [] }) };
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  stub(t, PaystackRefund, 'findById', async () => currentRefund);
  stub(t, PaystackRefund, 'findByIdAndUpdate', async (_id, update) => {
    currentRefund = { ...currentRefund, ...update.$set };
    return currentRefund;
  });
  stub(t, PaymentAttempt, 'findByIdAndUpdate', async () => ({}));
  stub(t, Orders, 'findOneAndUpdate', async () => { throw new Error('late refund must not reverse an unrelated paid order'); });

  assert.equal((await processPaystackRefund(refund._id)).status, 'PENDING');
  providerStatus = 'processed';
  assert.equal((await processPaystackRefund(refund._id)).status, 'PROCESSED');
  assert.equal(postCount, 1);
});
