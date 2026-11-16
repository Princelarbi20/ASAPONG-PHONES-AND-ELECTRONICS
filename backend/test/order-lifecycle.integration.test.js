import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Product } from '../modules/productSchema.js';
import { Orders } from '../modules/orderSchema.js';
import { expireOnlineOrder } from '../utils/orderExpiryWorker.js';

const replicaSetUri = process.env.MONGO_REPLICA_SET_URI;

test('replica-set expiry transaction releases inventory once under concurrent workers', {
  skip: !replicaSetUri && 'Set MONGO_REPLICA_SET_URI to run MongoDB transaction integration tests.',
}, async () => {
  const uri = new URL(replicaSetUri);
  uri.pathname = `/asapong_lifecycle_test_${process.pid}_${Date.now()}`;
  await mongoose.connect(uri.toString(), { serverSelectionTimeoutMS: 10_000 });
  try {
    const topology = mongoose.connection.client.topology.description.type;
    assert.ok(['ReplicaSetWithPrimary', 'Sharded'].includes(topology), `transactions require a replica set, received ${topology}`);

    const [product] = await Product.create([{
      name: 'Lifecycle integration product', description: 'Temporary integration fixture',
      price: 10, category: 'Test', brand: 'Test', stock: 1, shop: 'Integration Test Shop',
    }]);
    const [order] = await Orders.create([{
      customerType: 'GUEST', customerName: 'Integration Test', customerEmail: 'integration@example.test',
      paymentMethod: 'ONLINE', expiresAt: new Date(Date.now() - 1),
      items: [{ productId: product._id, name: product.name, price: product.price, quantity: 2 }],
      totalPrice: 20, status: 'PENDING', paymentStatus: 'FAILED',
      shippingAddress: { address: 'Test', city: 'Accra', state: 'Greater Accra', country: 'Ghana', postalCode: '00233' },
    }]);

    const results = await Promise.all([expireOnlineOrder(order._id), expireOnlineOrder(order._id)]);
    assert.equal(results.filter(Boolean).length, 1);
    const [updatedOrder, updatedProduct] = await Promise.all([
      Orders.findById(order._id).lean(), Product.findById(product._id).lean(),
    ]);
    assert.equal(updatedOrder.status, 'EXPIRED');
    assert.ok(updatedOrder.inventoryReleasedAt);
    assert.equal(updatedProduct.stock, 3);
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
