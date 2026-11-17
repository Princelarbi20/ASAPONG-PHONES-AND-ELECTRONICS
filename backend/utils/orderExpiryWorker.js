import mongoose from 'mongoose';
import { Orders } from '../modules/orderSchema.js';
import { Product } from '../modules/productSchema.js';
import {
  ORDER_EXPIRY_BATCH_SIZE,
  ORDER_EXPIRY_WORKER_INTERVAL_MS,
} from '../config/orderLifecycle.js';
import { CACHE_NAMESPACES, invalidateCacheNamespaces } from './responseCache.js';

const EXPIRABLE_PAYMENT_STATUSES = ['PENDING', 'FAILED', 'ABANDONED'];
let workerStarted = false;

export const expireOnlineOrder = async (orderId, now = new Date()) => {
  const session = await mongoose.startSession();
  let expired = false;
  try {
    await session.withTransaction(async () => {
      expired = false;
      const order = await Orders.findById(orderId).session(session);
      if (!order
        || order.status !== 'PENDING'
        || order.paymentMethod !== 'ONLINE'
        || !EXPIRABLE_PAYMENT_STATUSES.includes(order.paymentStatus)
        || !order.expiresAt
        || order.expiresAt > now
        || order.inventoryReleasedAt) return;

      const expiredOrder = await Orders.findOneAndUpdate(
        {
          _id: order._id,
          status: 'PENDING',
          paymentMethod: 'ONLINE',
          paymentStatus: { $in: EXPIRABLE_PAYMENT_STATUSES },
          expiresAt: { $lte: now },
          inventoryReleasedAt: null,
        },
        { $set: { status: 'EXPIRED', expiredAt: now, inventoryReleasedAt: now } },
        { new: true, runValidators: true, session },
      );
      if (!expiredOrder) return;

      const quantityByProduct = new Map();
      for (const item of order.items || []) {
        const productId = String(item.productId);
        quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + item.quantity);
      }

      for (const [productId, quantity] of quantityByProduct) {
        const restored = await Product.updateOne(
          { _id: productId, stock: { $lte: 1_000_000 - quantity } },
          { $inc: { stock: quantity } },
          { session, runValidators: true },
        );
        if (restored.matchedCount !== 1) {
          const error = new Error(`Cannot safely restore stock for order ${order._id}, product ${productId} is missing or exceeds the stock limit.`);
          error.code = 'ORDER_EXPIRY_PRODUCT_MISSING';
          throw error;
        }
      }
      expired = true;
    });

    if (expired) {
      await invalidateCacheNamespaces(
        CACHE_NAMESPACES.products,
        CACHE_NAMESPACES.adminOrders,
        CACHE_NAMESPACES.userOrders,
      );
    }
    return expired;
  } finally {
    await session.endSession();
  }
};

export const processExpiredOnlineOrders = async ({ now = new Date(), batchSize = ORDER_EXPIRY_BATCH_SIZE } = {}) => {
  const candidates = await Orders.find({
    status: 'PENDING',
    paymentMethod: 'ONLINE',
    paymentStatus: { $in: EXPIRABLE_PAYMENT_STATUSES },
    expiresAt: { $lte: now },
    inventoryReleasedAt: null,
  }).select('_id').sort({ expiresAt: 1, _id: 1 }).limit(batchSize).lean();

  let processed = 0;
  for (const candidate of candidates) {
    try {
      if (await expireOnlineOrder(candidate._id, now)) processed += 1;
    } catch (error) {
      console.error('[orders] expiry failed', JSON.stringify({
        orderId: String(candidate._id),
        errorCode: error?.code,
        errorName: error?.name,
      }));
    }
  }
  return { found: candidates.length, expired: processed };
};

export const startOrderExpiryWorker = () => {
  if (workerStarted) return;
  workerStarted = true;
  const schedule = () => {
    const timer = setTimeout(async () => {
      try {
        const result = await processExpiredOnlineOrders();
        if (result.expired) console.info('[orders] expired online orders', JSON.stringify(result));
      } catch (error) {
        console.error('[orders] expiry scan failed', error?.code || error?.name);
      } finally {
        schedule();
      }
    }, ORDER_EXPIRY_WORKER_INTERVAL_MS);
    timer.unref?.();
  };

  void processExpiredOnlineOrders()
    .then((result) => { if (result.expired) console.info('[orders] expired online orders', JSON.stringify(result)); })
    .catch((error) => console.error('[orders] initial expiry scan failed', error?.code || error?.name))
    .finally(schedule);
};
