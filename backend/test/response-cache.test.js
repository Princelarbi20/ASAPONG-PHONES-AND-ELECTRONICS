import test from 'node:test';
import assert from 'node:assert/strict';
import { CACHE_NAMESPACES, CACHE_TTL_SECONDS, createResponseCacheService } from '../utils/responseCache.js';

class MemoryRedis {
  values = new Map();
  writes = [];
  reads = 0;
  async mget(...keys) { return keys.map((key) => this.values.get(key) ?? null); }
  async get(key) { this.reads += 1; return this.values.get(key) ?? null; }
  async set(key, value, mode, ttl) {
    this.writes.push({ key, value, mode, ttl });
    this.values.set(key, value);
    return 'OK';
  }
  async incr(key) {
    const value = Number(this.values.get(key) || 0) + 1;
    this.values.set(key, String(value));
    return value;
  }
  async del(key) { return this.values.delete(key) ? 1 : 0; }
}

const makeResponse = () => ({
  statusCode: 200,
  headers: {},
  body: undefined,
  setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const request = (overrides = {}) => ({ method: 'GET', path: '/products', query: {}, ...overrides });

const invoke = async (middleware, req, body) => {
  const res = makeResponse();
  await middleware(req, res, async () => res.status(200).json(typeof body === 'function' ? await body() : body));
  return res;
};

test('cache miss stores the Mongo response with the configured TTL and the next request hits', async () => {
  const client = new MemoryRedis();
  const service = createResponseCacheService({ client, isReady: () => true });
  const middleware = service.cacheJsonResponse({ namespace: CACHE_NAMESPACES.products });

  const miss = await invoke(middleware, request(), { success: true, products: [{ name: 'Phone' }] });
  await new Promise(setImmediate);
  const hit = await invoke(middleware, request(), { success: false });

  assert.equal(miss.headers['x-cache'], 'MISS');
  assert.equal(hit.headers['x-cache'], 'HIT');
  assert.deepEqual(hit.body, miss.body);
  assert.equal(client.writes[0].mode, 'EX');
  assert.equal(client.writes[0].ttl, CACHE_TTL_SECONDS);
  assert.equal(CACHE_TTL_SECONDS, 1200);
});

test('private cache keys isolate users and roles and are never marked publicly cacheable', async () => {
  const client = new MemoryRedis();
  const service = createResponseCacheService({ client, isReady: () => true });
  const middleware = service.cacheJsonResponse({ namespace: CACHE_NAMESPACES.userOrders, privateScope: 'user' });
  const userA = { id: 'user-a', role: 'USER', accountType: 'USER' };
  const userB = { id: 'user-b', role: 'USER', accountType: 'USER' };
  const adminA = { id: 'user-a', role: 'ADMIN', accountType: 'USER' };

  await invoke(middleware, request({ user: userA, path: '/my-orders' }), { orders: ['A'] });
  await invoke(middleware, request({ user: userB, path: '/my-orders' }), { orders: ['B'] });
  await invoke(middleware, request({ user: adminA, path: '/my-orders' }), { orders: ['admin-scope'] });
  const aHit = await invoke(middleware, request({ user: userA, path: '/my-orders' }), { orders: ['wrong'] });
  const noIdentity = await invoke(middleware, request({ path: '/my-orders' }), { orders: ['database'] });

  assert.equal(aHit.headers['x-cache'], 'HIT');
  assert.deepEqual(aHit.body.orders, ['A']);
  assert.equal(aHit.headers['cache-control'], 'private, no-store');
  assert.equal(noIdentity.headers['cache-control'], 'private, no-store');
  assert.equal(noIdentity.headers['x-cache'], undefined);
});

test('namespace invalidation prevents old entries and late miss writes from becoming visible', async () => {
  const client = new MemoryRedis();
  const service = createResponseCacheService({ client, isReady: () => true });
  const middleware = service.cacheJsonResponse({ namespace: CACHE_NAMESPACES.products });
  await invoke(middleware, request(), { products: ['old'] });
  await new Promise(setImmediate);

  const afterInvalidation = await service.invalidateCacheNamespace(CACHE_NAMESPACES.products);
  const miss = await invoke(middleware, request(), { products: ['new'] });
  await new Promise(setImmediate);
  assert.equal(afterInvalidation, true);
  assert.equal(miss.headers['x-cache'], 'MISS');

  let releaseDatabaseRead;
  const delayedRead = invoke(middleware, request({ path: '/racing-products' }), () => new Promise((resolve) => { releaseDatabaseRead = resolve; }));
  await new Promise(setImmediate);
  await service.invalidateCacheNamespace(CACHE_NAMESPACES.products);
  releaseDatabaseRead({ products: ['stale-race'] });
  await delayedRead;
  await new Promise(setImmediate);

  const nextRequest = await invoke(middleware, request({ path: '/racing-products' }), { products: ['fresh'] });
  assert.equal(nextRequest.headers['x-cache'], 'MISS');
});

test('Redis unavailable bypasses cache and invalidation failure requests recovery without throwing', async () => {
  const client = new MemoryRedis();
  let recoveryRequests = 0;
  const unavailable = createResponseCacheService({ client, isReady: () => false });
  const response = await invoke(
    unavailable.cacheJsonResponse({ namespace: CACHE_NAMESPACES.products }),
    request(),
    { source: 'mongo' },
  );
  assert.deepEqual(response.body, { source: 'mongo' });
  assert.equal(response.headers['x-cache'], undefined);
  assert.equal(client.reads, 0);

  client.incr = async () => { throw new Error('connection reset'); };
  const available = createResponseCacheService({
    client,
    isReady: () => true,
    onInvalidationFailure: () => { recoveryRequests += 1; },
  });
  assert.equal(await available.invalidateCacheNamespace(CACHE_NAMESPACES.products), false);
  assert.equal(recoveryRequests, 1);
});
