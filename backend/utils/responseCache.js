import { createHash } from 'node:crypto';
import redis, { isRedisCacheReady, recoverRedisCache } from '../config/redis.js';

export const CACHE_TTL_SECONDS = 20 * 60;
export const CACHE_NAMESPACES = Object.freeze({
  products: 'products',
  adminOrders: 'admin-orders',
  userOrders: 'user-orders',
  adminUsers: 'admin-users',
  adminDashboard: 'admin-dashboard',
});

const REDIS_OPERATION_TIMEOUT_MS = 200;
const REDIS_INVALIDATION_TIMEOUT_MS = 100;
const CACHE_COALESCE_WAIT_MS = 1_000;
const CACHE_FILL_MAX_MS = 20_000;

const withTimeout = (operation, timeoutMs) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Redis operation timed out.')), timeoutMs);
  timer.unref?.();
  Promise.resolve().then(operation).then(resolve, reject).finally(() => clearTimeout(timer));
});

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
};

const hash = (value) => createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');

export const createResponseCacheService = ({
  client = redis,
  isReady = isRedisCacheReady,
  onInvalidationFailure = recoverRedisCache,
} = {}) => {
  const pendingCacheFills = new Map();
  const getCacheVersions = async (namespace) => {
    const [epoch, version] = await withTimeout(
      () => client.mget('cache:epoch', `cache:version:${namespace}`),
      REDIS_OPERATION_TIMEOUT_MS,
    );
    return { cacheEpoch: epoch || '0', namespaceVersion: version || '0' };
  };

  const cacheJsonResponse = ({ namespace, ttlSeconds = CACHE_TTL_SECONDS, privateScope = null }) => async (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (privateScope) res.setHeader('Cache-Control', 'private, no-store');
    if (!isReady()) return next();

    let identity = 'public';
    if (privateScope) {
      const userId = req.user?.id || req.user?._id;
      const role = String(req.user?.role || '').toUpperCase();
      const accountType = String(req.user?.accountType || '').toUpperCase();
      if (!userId || !role || !accountType) return next();
      identity = `${privateScope}:${accountType}:${role}:${userId}`;
    }

    let key;
    let cachedBody;
    try {
      const versions = await getCacheVersions(namespace);
      const requestHash = hash({ path: req.path, query: req.query || {}, identity });
      key = `cache:${namespace}:e${versions.cacheEpoch}:v${versions.namespaceVersion}:${requestHash}`;
      cachedBody = await withTimeout(() => client.get(key), REDIS_OPERATION_TIMEOUT_MS);
    } catch (error) {
      console.warn('[cache] read skipped', JSON.stringify({ namespace, errorName: error?.name }));
      return next();
    }

    if (cachedBody !== null) {
      let parsedBody;
      try {
        parsedBody = JSON.parse(cachedBody);
      } catch (parseError) {
        // Corrupt values are misses and will be replaced after MongoDB responds.
        void withTimeout(() => client.del(key), REDIS_OPERATION_TIMEOUT_MS).catch(() => {});
      }
      if (parsedBody !== undefined) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(parsedBody);
      }
    }

    const pendingFill = pendingCacheFills.get(key);
    if (pendingFill) {
      let waitTimer;
      const sharedResponse = await Promise.race([
        pendingFill.promise,
        new Promise((resolve) => {
          waitTimer = setTimeout(() => resolve(null), CACHE_COALESCE_WAIT_MS);
          waitTimer.unref?.();
        }),
      ]);
      clearTimeout(waitTimer);
      if (sharedResponse) {
        res.setHeader('X-Cache', 'COALESCED');
        return res.status(sharedResponse.status).json(sharedResponse.body);
      }
      return next();
    }

    let resolveFill;
    const fillPromise = new Promise((resolve) => { resolveFill = resolve; });
    let fillTimeout;
    const fill = { promise: fillPromise };
    pendingCacheFills.set(key, fill);
    const finishFill = (sharedResponse = null) => {
      clearTimeout(fillTimeout);
      if (pendingCacheFills.get(key) === fill) pendingCacheFills.delete(key);
      resolveFill(sharedResponse);
    };
    fillTimeout = setTimeout(() => finishFill(), CACHE_FILL_MAX_MS);
    fillTimeout.unref?.();
    // If a handler errors or closes without returning JSON, release waiters so
    // they can perform their own request instead of hanging indefinitely.
    res.once?.('finish', () => finishFill());
    res.once?.('close', () => finishFill());

    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      let encoded;
      let sharedResponse = null;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          encoded = JSON.stringify(body);
          if (encoded !== undefined) {
            void withTimeout(() => client.set(key, encoded, 'EX', ttlSeconds), REDIS_OPERATION_TIMEOUT_MS).catch((error) => {
              console.warn('[cache] write skipped', JSON.stringify({ namespace, errorName: error?.name }));
            });
            sharedResponse = { status: res.statusCode, body };
          }
        } catch (error) {
          console.warn('[cache] response was not cacheable', JSON.stringify({ namespace, errorName: error?.name }));
        }
      }
      finishFill(sharedResponse);
      return originalJson(body);
    };
    return next();
  };

  const invalidateNamespaceVersion = async (namespace) => {
    if (!isReady()) return false;
    try {
      await withTimeout(() => client.incr(`cache:version:${namespace}`), REDIS_INVALIDATION_TIMEOUT_MS);
      return true;
    } catch (error) {
      console.warn('[cache] invalidation recovery requested', JSON.stringify({ namespace, errorName: error?.name }));
      return false;
    }
  };

  const invalidateNamespaces = async (requestedNamespaces) => {
    const namespaces = new Set(requestedNamespaces);
    if ([
      CACHE_NAMESPACES.products,
      CACHE_NAMESPACES.adminOrders,
      CACHE_NAMESPACES.userOrders,
      CACHE_NAMESPACES.adminUsers,
    ].some((namespace) => namespaces.has(namespace))) {
      namespaces.add(CACHE_NAMESPACES.adminDashboard);
    }
    const results = await Promise.all([...namespaces].map(invalidateNamespaceVersion));
    const succeeded = results.every(Boolean);
    if (!succeeded && isReady()) {
      // A MongoDB commit must not be rolled back or reported as failed because Redis
      // is unavailable. Disable this client once; its next connection advances the
      // shared epoch, making all potentially stale entries unreachable.
      try { onInvalidationFailure(); } catch (recoveryError) {
        console.error('[cache] recovery callback failed', recoveryError?.code || recoveryError?.name);
      }
    }
    return succeeded;
  };

  const invalidateCacheNamespace = (namespace) => invalidateNamespaces([namespace]);
  const invalidateCacheNamespaces = (...namespaces) => invalidateNamespaces(namespaces);

  return { cacheJsonResponse, invalidateCacheNamespace, invalidateCacheNamespaces };
};

const responseCache = createResponseCacheService();
export const cacheJsonResponse = responseCache.cacheJsonResponse;
export const invalidateCacheNamespace = responseCache.invalidateCacheNamespace;
export const invalidateCacheNamespaces = responseCache.invalidateCacheNamespaces;
