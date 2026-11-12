import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Orders } from '../modules/orderSchema.js';
import { PaymentAttempt } from '../modules/paymentAttemptSchema.js';
import { Product } from '../modules/productSchema.js';
import { Register } from '../modules/userRegister.js';
import { getAllOrdersController } from '../controllers/adminControllers/getAllOrdersController.js';
import { getPaymentTransactionsController } from '../controllers/adminControllers/getPaymentTransactionsController.js';
import { getAllProducts } from '../controllers/adminControllers/getAllProductsController.js';
import { createOrderController } from '../controllers/userController/createOrderController.js';
import { initializePaymentController } from '../controllers/Payment-controllers/initializePaymentController.js';
import { Counter } from '../modules/counterSchema.js';
import { validatePaginationQuery, validateRequest } from '../middleware/requestValidation.js';
import { productListQueryFields } from '../route/userRouter.js';

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const stub = (t, object, key, implementation) => {
  const original = object[key];
  object[key] = implementation;
  t.after(() => { object[key] = original; });
};

const queryBuilder = (records, onCall = () => {}) => ({
  sort(value) { onCall('sort', value); return this; },
  skip(value) { onCall('skip', value); return this; },
  limit(value) { onCall('limit', value); return this; },
  populate() { return this; },
  lean() { return Promise.resolve(records); },
  then(resolve, reject) { return Promise.resolve(records).then(resolve, reject); },
});

const runProductQueryValidation = async (query) => {
  const req = { query, body: {} };
  const res = makeResponse();
  let nextCalled = false;
  validatePaginationQuery(req, res, () => { nextCalled = true; });
  if (!nextCalled) return res;
  await validateRequest({
    query: {
      ...productListQueryFields,
      category: (value) => typeof value === 'string' && value.length <= 100,
      search: (value) => typeof value === 'string' && value.length <= 100,
      brandSort: (value) => ['none', 'asc', 'desc'].includes(value),
    },
    body: {},
  })(req, res, () => { nextCalled = true; });
  return nextCalled ? null : res;
};

test('product listing accepts unpaginated and paginated query parameters', async () => {
  assert.equal(await runProductQueryValidation({}), null);
  assert.equal(await runProductQueryValidation({ page: '2', limit: '12', category: 'Phones', search: 'pixel', brandSort: 'asc' }), null);
  const invalid = await runProductQueryValidation({ page: '0', limit: '101' });
  assert.equal(invalid.statusCode, 422);
  assert.deepEqual(invalid.body.errors.map(({ field }) => field), ['query.page', 'query.limit']);
});

test('product listing controller handles unpaginated and paginated filtered requests', async (t) => {
  const products = [{ _id: 'product-1', name: 'Pixel' }];
  let capturedFilter;
  const calls = [];
  stub(t, Product, 'find', (filter) => {
    capturedFilter = filter;
    return queryBuilder(products, (...call) => calls.push(call));
  });
  stub(t, Product, 'countDocuments', async () => 25);

  const unpaginatedResponse = makeResponse();
  await getAllProducts({ query: {} }, unpaginatedResponse);
  assert.equal(unpaginatedResponse.statusCode, 200);
  assert.equal(unpaginatedResponse.body.pagination, undefined);

  const paginatedResponse = makeResponse();
  await getAllProducts({ query: { page: '2', limit: '12', category: 'Phones', search: 'pixel', brandSort: 'asc' } }, paginatedResponse);
  assert.equal(paginatedResponse.statusCode, 200);
  assert.deepEqual(paginatedResponse.body.pagination, { page: 2, limit: 12, total: 25, totalPages: 3 });
  assert.equal(calls.some(([name, value]) => name === 'skip' && value === 12), true);
  assert.equal(capturedFilter.category.test('Phones'), true);
  assert.equal(capturedFilter.$or[0].name.test('Pixel'), true);

  await getAllProducts({ query: { page: '3', limit: '12', category: 'Phones' } }, makeResponse());
  assert.equal(calls.some(([name, value]) => name === 'skip' && value === 24), true);
});

test('order manifest resolves registered customers, marks explicit guests, and preserves unknown historical references', async (t) => {
  const registeredId = '64b000000000000000000001';
  const customer = { _id: registeredId, userName: 'Amina Customer', email: 'amina@example.com', phone: '0123456789' };
  const records = [
    { _id: 'order-registered', user: registeredId, customerType: 'REGISTERED' },
    { _id: 'order-email-snapshot', customerEmail: 'amina@example.com', customerType: 'REGISTERED' },
    { _id: 'order-guest', user: null, customerType: 'GUEST' },
    { _id: 'order-history', user: null },
  ];
  stub(t, Orders, 'find', () => queryBuilder(records));
  stub(t, Orders, 'countDocuments', async () => records.length);
  stub(t, Orders, 'distinct', async () => []);
  stub(t, Register, 'find', () => ({ select() { return { lean: async () => [customer] }; } }));

  const res = makeResponse();
  await getAllOrdersController({ query: {} }, res, (error) => { throw error; });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.orders[0].user.userName, 'Amina Customer');
  assert.equal(res.body.orders[0].customerName, 'Amina Customer');
  assert.equal(res.body.orders[1].user.userName, 'Amina Customer');
  assert.equal(res.body.orders[2].customerName, 'Guest');
  assert.equal(res.body.orders[3].customerName, undefined);
  assert.notEqual(res.body.orders[3].customerName, 'Guest');
});

test('transaction manifest resolves registered customers and labels only explicit guest records as guests', async (t) => {
  const registeredId = '64b000000000000000000002';
  const customer = { _id: registeredId, userName: 'Kojo Customer', email: 'kojo@example.com' };
  const records = [
    { _id: 'attempt-registered', user: registeredId, customerType: 'REGISTERED' },
    { _id: 'attempt-email-snapshot', customerEmail: 'kojo@example.com', customerType: 'REGISTERED' },
    { _id: 'attempt-guest', user: null, customerType: 'GUEST' },
    { _id: 'attempt-history', user: null },
  ];
  stub(t, PaymentAttempt, 'find', () => queryBuilder(records));
  stub(t, PaymentAttempt, 'countDocuments', async () => records.length);
  stub(t, PaymentAttempt, 'distinct', async () => []);
  stub(t, Register, 'find', () => ({ select() { return { lean: async () => [customer] }; } }));

  const res = makeResponse();
  await getPaymentTransactionsController({ query: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.transactions[0].user.userName, 'Kojo Customer');
  assert.equal(res.body.transactions[0].customerName, 'Kojo Customer');
  assert.equal(res.body.transactions[1].user.userName, 'Kojo Customer');
  assert.equal(res.body.transactions[2].customerName, 'Guest');
  assert.equal(res.body.transactions[3].customerName, undefined);
  assert.notEqual(res.body.transactions[3].customerName, 'Guest');
});

test('order and payment schemas distinguish registered customers from explicit guests', () => {
  const registeredOrder = new Orders({ user: new mongoose.Types.ObjectId() });
  const guestOrder = new Orders({ customerType: 'GUEST' });
  const registeredAttempt = new PaymentAttempt({ user: new mongoose.Types.ObjectId() });
  const guestAttempt = new PaymentAttempt({ customerType: 'GUEST' });
  assert.equal(registeredOrder.customerType, 'REGISTERED');
  assert.equal(registeredAttempt.customerType, 'REGISTERED');
  const orderUserRequired = Orders.schema.path('user').options.required;
  const transactionUserRequired = PaymentAttempt.schema.path('user').options.required;
  assert.equal(orderUserRequired.call(registeredOrder), true);
  assert.equal(transactionUserRequired.call(registeredAttempt), true);
  assert.equal(orderUserRequired.call(guestOrder), false);
  assert.equal(transactionUserRequired.call(guestAttempt), false);
});

test('authenticated checkout stores the authenticated user and customer snapshot on the order', async (t) => {
  const userId = '64b000000000000000000003';
  const productId = '64b000000000000000000004';
  const orderId = '64b000000000000000000005';
  const user = {
    _id: userId,
    userName: 'Ama Shopper',
    email: 'ama@example.com',
    cart: [{ productId: { _id: productId, name: 'Phone', price: 100, images: [] }, quantity: 1 }],
  };
  let createdOrder;
  const orderQuery = queryBuilder(null);
  orderQuery.populate = () => orderQuery;
  orderQuery.then = (resolve, reject) => Promise.resolve({ ...createdOrder, user }).then(resolve, reject);

  stub(t, mongoose, 'startSession', async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  }));
  stub(t, Register, 'findById', () => ({ session() { return this; }, populate: async () => user }));
  stub(t, Register, 'findByIdAndUpdate', async () => user);
  stub(t, Product, 'updateOne', async () => ({ modifiedCount: 1 }));
  stub(t, Counter, 'findOneAndUpdate', async () => ({ seq: 1 }));
  stub(t, Orders, 'create', async ([order]) => {
    createdOrder = { ...order, _id: orderId };
    return [createdOrder];
  });
  stub(t, Orders, 'findById', () => orderQuery);

  const res = makeResponse();
  await createOrderController({
    user: { id: userId },
    body: { shippingAddress: { address: '1 Main St', city: 'Accra', state: 'Greater Accra', country: 'Ghana', postalCode: '00233' } },
  }, res, (error) => { throw error; });

  assert.equal(res.statusCode, 201);
  assert.equal(createdOrder.user, userId);
  assert.equal(createdOrder.customerType, 'REGISTERED');
  assert.equal(createdOrder.customerName, 'Ama Shopper');
  assert.equal(createdOrder.customerEmail, 'ama@example.com');
});

test('payment initialization persists the order customer ID and snapshot on the transaction', async (t) => {
  const userId = '64b000000000000000000006';
  const orderId = '64b000000000000000000007';
  const order = {
    _id: orderId,
    user: { _id: userId, userName: 'Yaw Buyer', email: 'yaw@example.com' },
    customerType: 'REGISTERED',
    totalPrice: 120,
    paymentStatus: 'PENDING',
  };
  let createdAttempt;
  const previousEnv = Object.fromEntries(['NODE_ENV', 'PAYSTACK_SECRET_KEY', 'PAYSTACK_BASE_URL', 'CLIENT_URL', 'FRONTEND_ORIGIN'].map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.NODE_ENV = 'test';
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_regressionkey123';
  process.env.PAYSTACK_BASE_URL = 'https://api.paystack.co';
  process.env.FRONTEND_ORIGIN = 'https://shop.example';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ status: true, data: { reference: 'payment-reference-123' } }) });
  t.after(() => { globalThis.fetch = originalFetch; });
  stub(t, Orders, 'findById', () => ({ populate: async () => order }));
  stub(t, Orders, 'findByIdAndUpdate', async () => ({}));
  stub(t, PaymentAttempt, 'create', async (attempt) => {
    createdAttempt = { ...attempt, _id: '64b000000000000000000008' };
    return createdAttempt;
  });
  stub(t, PaymentAttempt, 'findByIdAndUpdate', async () => ({}));

  const res = makeResponse();
  await initializePaymentController({ body: { orderId }, user: { id: userId } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(createdAttempt.user, userId);
  assert.equal(createdAttempt.customerType, 'REGISTERED');
  assert.equal(createdAttempt.customerName, 'Yaw Buyer');
  assert.equal(createdAttempt.customerEmail, 'yaw@example.com');
});
