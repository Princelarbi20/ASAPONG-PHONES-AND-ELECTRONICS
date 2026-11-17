import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { Product } from '../modules/productSchema.js';
import { userRouter } from '../route/userRouter.js';
import { createHealthCheckHandler } from '../utils/healthCheck.js';

const start = async (app) => new Promise((resolve, reject) => {
  const server = app.listen(0, '127.0.0.1', () => resolve(server));
  server.once('error', reject);
});

const queryBuilder = (products, capture) => ({
  select(value) { capture.select = value; return this; },
  sort(value) { capture.sort = value; return this; },
  skip(value) { capture.skip = value; return this; },
  limit(value) { capture.limit = value; return this; },
  lean() { return Promise.resolve(products); },
});

test('public product endpoint accepts the frontend query variants and rejects invalid pagination', async (t) => {
  const originalFind = Product.find;
  const originalCount = Product.countDocuments;
  const capture = {};
  const products = [{ _id: 'product-1', name: 'Pixel', category: 'Phones' }];
  Product.find = () => queryBuilder(products, capture);
  Product.countDocuments = async () => products.length;
  t.after(() => {
    Product.find = originalFind;
    Product.countDocuments = originalCount;
  });

  const app = express();
  app.use('/api/v1', userRouter);
  const server = await start(app);
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/get-All-product`;

  for (const query of [
    '',
    '?summary=true',
    '?category=Phones&page=1&limit=12&search=pixel&brandSort=asc&summary=true',
  ]) {
    const response = await fetch(`${baseUrl}${query}`);
    assert.equal(response.status, 200, `expected query ${query || '(no query)'} to pass`);
    assert.equal((await response.json()).success, true);
  }

  const invalid = await fetch(`${baseUrl}?page=0&limit=12`);
  assert.equal(invalid.status, 422);
  const errorBody = await invalid.json();
  assert.deepEqual(errorBody.errors.map(({ field }) => field), ['query.page']);
});

test('HTTP health endpoint returns 200 only when its readiness check passes', async (t) => {
  let ready = true;
  const app = express();
  app.get('/healthz', createHealthCheckHandler(() => ready));
  const server = await start(app);
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/healthz`;

  const healthy = await fetch(url);
  assert.equal(healthy.status, 200);
  assert.deepEqual(await healthy.json(), { status: 'ok' });

  ready = false;
  const unhealthy = await fetch(url);
  assert.equal(unhealthy.status, 503);
  assert.deepEqual(await unhealthy.json(), { status: 'unavailable' });
});
