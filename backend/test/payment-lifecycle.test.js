import test from 'node:test';
import assert from 'node:assert/strict';
import { Orders } from '../modules/orderSchema.js';
import { PaymentAttempt } from '../modules/paymentAttemptSchema.js';
import { applyPaystackPayment } from '../utils/paystack.js';
import { initializePaymentController } from '../controllers/Payment-controllers/initializePaymentController.js';

const stub = (t, object, key, implementation) => {
  const original = object[key];
  object[key] = implementation;
  t.after(() => { object[key] = original; });
};

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const verifiedPayment = (overrides = {}) => ({
  reference: 'reference-123456',
  status: 'success',
  amount: 10_000,
  currency: 'GHS',
  id: 77,
  ...overrides,
});

test('Paystack success cannot mark a cancelled order as PAID', async (t) => {
  let savedAttemptStatus;
  let orderWrites = 0;
  stub(t, PaymentAttempt, 'findOneAndUpdate', async (filter, update) => {
    savedAttemptStatus = update.$set.status;
    return { reference: filter.reference };
  });
  stub(t, PaymentAttempt, 'findOne', async () => ({ order: 'order-cancelled' }));
  stub(t, Orders, 'findOneAndUpdate', async () => { orderWrites += 1; return null; });

  const result = await applyPaystackPayment(
    { _id: 'order-cancelled', user: 'user-1', totalPrice: 100, status: 'CANCELLED', paymentStatus: 'PENDING' },
    verifiedPayment(),
    'reference-123456',
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'ORDER_CANCELLED');
  assert.equal(savedAttemptStatus, 'SUCCESSFUL', 'the verified gateway capture remains visible for reconciliation');
  assert.equal(orderWrites, 0);
});

test('Paystack update query excludes cancellation that races payment verification', async (t) => {
  let capturedFilter;
  stub(t, PaymentAttempt, 'findOneAndUpdate', async () => ({}));
  stub(t, PaymentAttempt, 'findOne', async () => ({ order: 'order-race' }));
  stub(t, Orders, 'findOneAndUpdate', async (filter) => {
    capturedFilter = filter;
    return null;
  });
  stub(t, Orders, 'findById', async () => ({
    _id: 'order-race',
    status: 'CANCELLED',
    paymentStatus: 'PENDING',
  }));

  const result = await applyPaystackPayment(
    { _id: 'order-race', user: 'user-1', totalPrice: 100, status: 'PENDING', paymentStatus: 'PENDING' },
    verifiedPayment(),
    'reference-123456',
  );

  assert.ok(capturedFilter.status.$nin.includes('CANCELLED'));
  assert.ok(capturedFilter.status.$nin.includes('EXPIRED'));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'ORDER_CANCELLED');
});

test('payment initialization rejects an already-cancelled order before contacting Paystack', async (t) => {
  const previousFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => { fetchCalled = true; throw new Error('Paystack must not be called'); };
  t.after(() => { globalThis.fetch = previousFetch; });
  stub(t, Orders, 'findById', () => ({
    populate: async () => ({
      _id: 'order-cancelled',
      user: { _id: 'user-1', email: 'buyer@example.com' },
      status: 'CANCELLED',
      paymentStatus: 'PENDING',
      totalPrice: 100,
    }),
  }));

  const res = makeResponse();
  await initializePaymentController({ body: { orderId: 'order-cancelled' }, user: { id: 'user-1' } }, res);

  assert.equal(res.statusCode, 409);
  assert.equal(fetchCalled, false);
});

test('verified provider reference must match the requested reference', async () => {
  const result = await applyPaystackPayment(
    { _id: 'order-1', totalPrice: 100, status: 'PENDING', paymentStatus: 'PENDING' },
    verifiedPayment({ reference: 'different-reference' }),
    'reference-123456',
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'REFERENCE_MISMATCH');
});

test('Paystack confirmation cannot activate an expired order', async (t) => {
  let orderWrites = 0;
  stub(t, PaymentAttempt, 'findOne', async () => ({ order: 'order-expired' }));
  stub(t, PaymentAttempt, 'findOneAndUpdate', async () => ({ reference: 'reference-123456' }));
  stub(t, Orders, 'findOneAndUpdate', async () => { orderWrites += 1; return null; });
  stub(t, Orders, 'findById', async () => ({ _id: 'order-expired', status: 'EXPIRED', paymentStatus: 'PENDING' }));

  const result = await applyPaystackPayment(
    { _id: 'order-expired', totalPrice: 100, status: 'EXPIRED', paymentStatus: 'PENDING', paymentMethod: 'ONLINE' },
    verifiedPayment(),
    'reference-123456',
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'ORDER_EXPIRED');
  assert.equal(orderWrites, 0);
});
