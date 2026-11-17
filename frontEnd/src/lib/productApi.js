import axiosInstance from './axios';

// Share catalog responses briefly across homepage sections. The short TTL keeps
// cards and navigation in sync while avoiding a burst of identical full-list
// requests during the same page visit.
const pendingProductRequests = new Map();
const cachedProductResponses = new Map();
const PRODUCT_RESPONSE_TTL_MS = 10_000;

const normalizeParams = (params = {}) => Object.fromEntries(
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right)),
);

export const getProducts = (params) => {
  for (const [entryKey, entry] of cachedProductResponses) {
    if (entry.expiresAt <= Date.now()) cachedProductResponses.delete(entryKey);
  }
  const normalizedParams = normalizeParams(params);
  const key = JSON.stringify(normalizedParams);
  const cached = cachedProductResponses.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.response);
  }
  if (cached) cachedProductResponses.delete(key);

  const pending = pendingProductRequests.get(key);
  if (pending) return pending;

  const request = axiosInstance.get('/get-All-product', {
    ...(Object.keys(normalizedParams).length ? { params: normalizedParams } : {}),
  });
  request.then((response) => {
    cachedProductResponses.set(key, { response, expiresAt: Date.now() + PRODUCT_RESPONSE_TTL_MS });
    while (cachedProductResponses.size > 50) {
      cachedProductResponses.delete(cachedProductResponses.keys().next().value);
    }
  }).catch(() => {});
  pendingProductRequests.set(key, request);
  request.finally(() => {
    if (pendingProductRequests.get(key) === request) pendingProductRequests.delete(key);
  }).catch(() => {});
  return request;
};

export const invalidateProductCache = () => {
  cachedProductResponses.clear();
};
