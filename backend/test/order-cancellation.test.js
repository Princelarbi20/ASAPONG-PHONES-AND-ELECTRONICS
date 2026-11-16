import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Orders } from '../modules/orderSchema.js';
import { Product } from '../modules/productSchema.js';
import { updateOrderStatusController } from '../controllers/adminControllers/updateOdersStatus.js';

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const stub = (t, object, key, implementation) => {
  const original = object[key];
  object[key] = implementation;
  t.after(() => { object[key] = original; });
};

const transactionSession = () => ({
  async withTransaction(callback) { return callback(); },
  async endSession() {},
});

test('cancelling an unpaid order restores reserved stock once, in the same transaction', async (t) => {
  const previousEmailSink = process.env.EMAIL_SINK;
  process.env.EMAIL_SINK = 'true';
  t.after(() => {
    if (previousEmailSink === undefined) delete process.env.EMAIL_SINK;
    else process.env.EMAIL_SINK = previousEmailSink;
  });
  const productId = '64b000000000000000000011';
  const orderId = '64b000000000000000000012';
  const order = {
    _id: orderId,
    status: 'PENDING',
    paymentStatus: 'FAILED',
    items: [{ productId, quantity: 2 }, { productId, quantity: 1 }],
    user: { _id: 'user-1', userName: 'Test Buyer', email: 'test-buyer@example.com' },
  };
  let stock = 4;
  let stockUpdates = 0;
  let orderWrites = 0;

  stub(t, mongoose, 'startSession', async () => transactionSession());
  stub(t, Orders, 'findById', () => ({
    session: async () => ({ ...order, items: order.items.map((item) => ({ ...item })) }),
    populate() { return this; },
    then(resolve, reject) {
      return Promise.resolve({ ...order, items: order.items.map((item) => ({ ...item })) }).then(resolve, reject);
    },
  }));
  stub(t, Orders, 'findOneAndUpdate', async (filter, update, options) => {
    assert.ok(options.session, 'order status update participates in the Mongo transaction');
    if (order.status !== filter.status) return null;
    order.status = update.$set.status;
    orderWrites += 1;
    return { ...order };
  });
  stub(t, Product, 'updateOne', async (filter, update, options) => {
    assert.ok(options.session, 'stock restoration participates in the Mongo transaction');
    assert.equal(String(filter._id), productId);
    stock += update.$inc.stock;
    stockUpdates += 1;
    return { matchedCount: 1 };
  });

  const req = { params: { id: orderId }, body: { status: 'CANCELLED' } };
  const firstResponse = makeResponse();
  await updateOrderStatusController(req, firstResponse, (error) => { throw error; });
  const repeatedResponse = makeResponse();
  await updateOrderStatusController(req, repeatedResponse, (error) => { throw error; });

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(repeatedResponse.statusCode, 200);
  assert.equal(order.status, 'CANCELLED');
  assert.equal(orderWrites, 1);
  assert.equal(stockUpdates, 1, 'repeating cancellation cannot apply a second stock increment');
  assert.equal(stock, 7, 'duplicate order lines are aggregated before restoration');
});

test('cancelling a paid order is blocked until Paystack confirms its reversal', async (t) => {
  const order = { _id: '64b000000000000000000013', status: 'CONFIRMED', paymentStatus: 'PAID', items: [] };
  let stockUpdates = 0;
  stub(t, mongoose, 'startSession', async () => transactionSession());
  stub(t, Orders, 'findById', () => ({ session: async () => order }));
  stub(t, Product, 'updateOne', async () => { stockUpdates += 1; return { matchedCount: 1 }; });

  const res = makeResponse();
  let nextError;
  await updateOrderStatusController({ params: { id: String(order._id) }, body: { status: 'CANCELLED' } }, res, (error) => { nextError = error; });

  assert.equal(nextError?.statusCode, 409);
  assert.match(nextError?.message || '', /refunded/i);
  assert.equal(stockUpdates, 0);
  assert.equal(order.status, 'CONFIRMED');
});
