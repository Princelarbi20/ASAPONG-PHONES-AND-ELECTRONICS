import test from 'node:test';
import assert from 'node:assert/strict';
import { OrderNotificationOutbox } from '../modules/orderNotificationOutbox.js';
import { Orders } from '../modules/orderSchema.js';
import { enqueueOrderNotification, processOrderNotificationOutbox } from '../utils/orderNotificationOutbox.js';

test('order notification enqueue and atomic claim request the post-update document and deliver once', async (t) => {
  const originalEnv = process.env.EMAIL_OUTBOX_ENCRYPTION_SECRET;
  process.env.EMAIL_OUTBOX_ENCRYPTION_SECRET = 'test-only-notification-encryption-secret';
  t.after(() => {
    if (originalEnv === undefined) delete process.env.EMAIL_OUTBOX_ENCRYPTION_SECRET;
    else process.env.EMAIL_OUTBOX_ENCRYPTION_SECRET = originalEnv;
  });

  const originals = {
    findOneAndUpdate: OrderNotificationOutbox.findOneAndUpdate,
    updateMany: OrderNotificationOutbox.updateMany,
    updateOne: OrderNotificationOutbox.updateOne,
    findById: Orders.findById,
  };
  t.after(() => {
    Object.assign(OrderNotificationOutbox, {
      findOneAndUpdate: originals.findOneAndUpdate,
      updateMany: originals.updateMany,
      updateOne: originals.updateOne,
    });
    Orders.findById = originals.findById;
  });

  const calls = [];
  let job;
  OrderNotificationOutbox.findOneAndUpdate = (filter, update, options) => {
    calls.push({ filter, update, options });
    if (filter.eventKey) {
      job = {
        _id: 'outbox-job-1',
        order: 'order-1',
        eventKey: filter.eventKey,
        type: update.$setOnInsert.type,
        encryptedPayload: update.$setOnInsert.encryptedPayload,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: new Date(0),
      };
      return Promise.resolve(job);
    }
    Object.assign(job, update.$set, { attempts: job.attempts + update.$inc.attempts });
    return { select: async (fields) => { calls.push({ select: fields }); return job; } };
  };
  OrderNotificationOutbox.updateMany = async (filter, update) => { calls.push({ filter, update, staleLockReset: true }); };
  let completion;
  OrderNotificationOutbox.updateOne = async (filter, update) => { completion = { filter, update }; };
  const order = {
    _id: { toString: () => 'order-1' },
    orderNumber: 123456,
    user: { userName: 'Customer', email: 'customer@example.com' },
    items: [],
    totalPrice: 0,
    paymentStatus: 'PENDING',
    paymentMethod: 'COD',
  };
  Orders.findById = () => ({ populate: async () => order });

  const enqueued = await enqueueOrderNotification({
    orderId: 'order-1',
    eventKey: 'order:order-1:status:CONFIRMED',
    type: 'STATUS_UPDATE',
    data: { previousStatus: 'PENDING', newStatus: 'CONFIRMED' },
  });
  assert.equal(enqueued, job);
  assert.equal(calls[0].options.returnDocument, 'after');
  assert.equal(calls[0].options.upsert, true);
  assert.deepEqual(calls[0].filter, { eventKey: 'order:order-1:status:CONFIRMED' });

  let sentMessage;
  const processed = await processOrderNotificationOutbox({
    send: async (message) => { sentMessage = message; return { success: true, messageId: 'gmail-message-1' }; },
  });
  assert.equal(processed, true);
  assert.equal(calls[1].staleLockReset, true);
  assert.deepEqual(calls[2].filter, {
    status: 'pending',
    attempts: { $lt: 8 },
    nextAttemptAt: { $lte: calls[2].filter.nextAttemptAt.$lte },
  });
  assert.equal(calls[2].options.returnDocument, 'after');
  assert.deepEqual(calls[2].options.sort, { createdAt: 1 });
  assert.equal(calls[3].select, '+encryptedPayload');
  assert.equal(job.status, 'sending');
  assert.equal(job.attempts, 1);
  assert.equal(sentMessage.to, 'customer@example.com');
  assert.match(sentMessage.subject, /confirmed/i);
  assert.equal(completion.filter._id, job._id);
  assert.equal(completion.filter.status, 'sending');
  assert.equal(completion.update.$set.status, 'sent');
  assert.deepEqual(completion.update.$unset, { encryptedPayload: 1, lastErrorCode: 1 });
});
