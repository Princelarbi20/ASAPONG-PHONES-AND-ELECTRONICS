import test from 'node:test';
import assert from 'node:assert/strict';

test('live Redis hit, miss, offline fallback, reconnect epoch, and stale-entry rejection', {
  skip: !process.env.REDIS_LIVE_URL,
}, async (t) => {
  const previousRedisUrl = process.env.REDIS_URL;
  process.env.REDIS_URL = process.env.REDIS_LIVE_URL;
  const [{ default: redis, isRedisCacheReady }, { createResponseCacheService, CACHE_NAMESPACES }] = await Promise.all([
    import('../config/redis.js'),
    import('../utils/responseCache.js'),
  ]);
  t.after(async () => {
    if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousRedisUrl;
    if (redis.status !== 'end') await redis.quit();
  });

  const waitFor = async (predicate) => {
    const deadline = Date.now() + 5_000;
    while (!(await predicate())) {
      if (Date.now() >= deadline) throw new Error('Timed out waiting for Redis state transition.');
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };
  await waitFor(isRedisCacheReady);
  await redis.flushdb();

  const service = createResponseCacheService({ client: redis, isReady: isRedisCacheReady });
  const middleware = service.cacheJsonResponse({ namespace: CACHE_NAMESPACES.products });
  const makeRes = () => ({
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });
  const invoke = async (body) => {
    const req = { method: 'GET', path: '/products', query: {} };
    const res = makeRes();
    await middleware(req, res, async () => res.status(200).json(typeof body === 'function' ? await body() : body));
    return res;
  };

  const miss = await invoke({ products: ['mongo-v1'] });
  await new Promise(setImmediate);
  const hit = await invoke({ products: ['should-not-run'] });
  assert.equal(miss.headers['x-cache'], 'MISS');
  assert.equal(hit.headers['x-cache'], 'HIT');
  assert.deepEqual(hit.body.products, ['mongo-v1']);

  const oldEpoch = Number(await redis.get('cache:epoch'));
  redis.disconnect(false);
  await waitFor(() => !isRedisCacheReady());
  const offline = await invoke({ products: ['mongo-offline'] });
  assert.equal(offline.headers['x-cache'], undefined);
  assert.deepEqual(offline.body.products, ['mongo-offline']);

  await redis.connect();
  await waitFor(isRedisCacheReady);
  assert.ok(Number(await redis.get('cache:epoch')) > oldEpoch);
  const afterReconnect = await invoke({ products: ['mongo-v2'] });
  assert.equal(afterReconnect.headers['x-cache'], 'MISS');
  assert.deepEqual(afterReconnect.body.products, ['mongo-v2']);

  const epochBeforeRecovery = Number(await redis.get('cache:epoch'));
  const originalIncr = redis.incr.bind(redis);
  redis.incr = async () => { throw new Error('simulated invalidation command failure'); };
  const invalidated = await service.invalidateCacheNamespace(CACHE_NAMESPACES.products);
  redis.incr = originalIncr;
  assert.equal(invalidated, false);
  await waitFor(async () => isRedisCacheReady() && Number(await redis.get('cache:epoch')) > epochBeforeRecovery);
});
