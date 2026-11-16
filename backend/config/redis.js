import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL?.trim();
export const redisConfigured = Boolean(redisUrl);
if (!redisConfigured) console.info('[redis] REDIS_URL is not set; response caching is disabled');

let cacheReady = false;
let recoveryRequested = false;
const connectionOptions = {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  connectTimeout: 5_000,
  retryStrategy(times) {
    return Math.min(times * 500, 3_000);
  },
};
const redis = redisConfigured
  ? new Redis(redisUrl, connectionOptions)
  : new Redis(connectionOptions);

redis.on('connect', () => {
  cacheReady = false;
  console.info('[redis] connecting');
});

redis.on('ready', async () => {
  try {
    // A new epoch makes every pre-outage entry unreachable. This also covers
    // MongoDB writes whose invalidation ran while Redis was unavailable.
    await redis.incr('cache:epoch');
    cacheReady = true;
    console.info('[redis] ready; cache epoch advanced');
  } catch (error) {
    cacheReady = false;
    console.error('[redis] cache epoch update failed', error?.code || error?.name);
    setImmediate(() => recoverRedisCache());
  } finally {
    recoveryRequested = false;
  }
});

redis.on('error', (error) => {
  cacheReady = false;
  console.error('[redis] connection error', error?.code || error?.name);
});

redis.on('reconnecting', () => {
  cacheReady = false;
  console.info('[redis] reconnecting');
});

redis.on('close', () => {
  cacheReady = false;
  console.info('[redis] connection closed');
  if (recoveryRequested) {
    setImmediate(() => {
      if (!recoveryRequested || redis.status !== 'end') return;
      redis.connect().catch((error) => {
        recoveryRequested = false;
        console.error('[redis] recovery connection failed', error?.code || error?.name);
      });
    });
  }
});

if (redisConfigured) {
  redis.connect().catch((error) => {
    cacheReady = false;
    console.error('[redis] initial connection failed', error?.code || error?.name);
  });
}

export const isRedisCacheReady = () => redisConfigured && cacheReady;

// If an invalidation command times out while ioredis still reports `ready`,
// force a reconnect. The next ready event advances the shared epoch, making
// entries written before the uncertain invalidation unreachable on all app instances.
export const recoverRedisCache = () => {
  cacheReady = false;
  if (!redisConfigured || recoveryRequested) return;

  recoveryRequested = true;
  try {
    redis.disconnect(false);
  } catch (error) {
    recoveryRequested = false;
    console.error('[redis] recovery request failed', error?.code || error?.name);
  }
};

export default redis;
