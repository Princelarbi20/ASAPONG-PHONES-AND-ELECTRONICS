import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Orders } from '../modules/orderSchema.js';
import { Product } from '../modules/productSchema.js';
import { expireOnlineOrder } from '../utils/orderExpiryWorker.js';

const stub = (t, object, key, implementation) => {
  const original = object[key];
  object[key] = implementation;
  t.after(() => { object[key] = original; });
};

test('expiry atomically marks an unpaid online order and restores aggregated stock once', async (t) => {
  const id = '64b000000000000000000021';
  const productId = '64b000000000000000000022';
  const now = new Date('2026-11-16T12:00:00Z');
  const order = {
    _id: id, status: 'PENDING', paymentMethod: 'ONLINE', paymentStatus: 'FAILED',
    expiresAt: new Date(now.getTime() - 1), inventoryReleasedAt: undefined,
    items: [{ productId, quantity: 2 }, { productId, quantity: 3 }],
  };
  let released = false;
  let stock = 0;
  let transactionCount = 0;
  const session = {
    async withTransaction(callback) { transactionCount += 1; return callback(); },
    async endSession() {},
  };
  stub(t, mongoose, 'startSession', async () => session);
  stub(t, Orders, 'findById', () => ({ session: async () => order }));
  stub(t, Orders, 'findOneAndUpdate', async (filter, update, options) => {
    assert.equal(options.session, session);
    assert.equal(filter.inventoryReleasedAt, null);
    if (released) return null;
    released = true;
    Object.assign(order, update.$set);
    return order;
  });
  stub(t, Product, 'updateOne', async (_filter, update, options) => {
    assert.equal(options.session, session);
    stock += update.$inc.stock;
    return { matchedCount: 1 };
  });

  const results = await Promise.all([expireOnlineOrder(id, now), expireOnlineOrder(id, now)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(order.status, 'EXPIRED');
  assert.equal(stock, 5);
  assert.equal(transactionCount, 2);
});

test('paid, COD, and not-yet-due orders are not expired or restocked', async (t) => {
  const session = { async withTransaction(callback) { return callback(); }, async endSession() {} };
  stub(t, mongoose, 'startSession', async () => session);
  let updates = 0;
  let currentOrder;
  stub(t, Orders, 'findById', () => ({ session: async () => currentOrder }));
  stub(t, Orders, 'findOneAndUpdate', async () => { updates += 1; return null; });
  for (currentOrder of [
    { status: 'PENDING', paymentMethod: 'ONLINE', paymentStatus: 'PAID', expiresAt: new Date(0), items: [] },
    { status: 'PENDING', paymentMethod: 'COD', paymentStatus: 'PENDING', expiresAt: new Date(0), items: [] },
    { status: 'PENDING', paymentMethod: 'ONLINE', paymentStatus: 'PENDING', expiresAt: new Date(Date.now() + 60_000), items: [] },
  ]) {
    assert.equal(await expireOnlineOrder('64b000000000000000000023'), false);
  }
  assert.equal(updates, 0);
});
