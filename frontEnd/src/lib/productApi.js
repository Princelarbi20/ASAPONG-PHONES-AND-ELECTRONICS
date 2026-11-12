import axiosInstance from './axios';

// Reuse an identical in-flight catalog request when multiple homepage sections
// mount together. Settled requests are removed so later visits see fresh data.
const pendingProductRequests = new Map();

const normalizeParams = (params = {}) => Object.fromEntries(
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right)),
);

export const getProducts = (params) => {
  const normalizedParams = normalizeParams(params);
  const key = JSON.stringify(normalizedParams);
  const pending = pendingProductRequests.get(key);
  if (pending) return pending;

  const request = axiosInstance.get('/get-All-product', {
    ...(Object.keys(normalizedParams).length ? { params: normalizedParams } : {}),
  });
  pendingProductRequests.set(key, request);
  request.finally(() => {
    if (pendingProductRequests.get(key) === request) pendingProductRequests.delete(key);
  }).catch(() => {});
  return request;
};
