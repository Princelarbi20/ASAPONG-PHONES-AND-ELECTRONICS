import test from 'node:test';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { jsonCompression } from '../middleware/jsonCompression.js';

const responseHarness = () => {
  const headers = new Map();
  let resolveSent;
  const sent = new Promise((resolve) => { resolveSent = resolve; });
  const res = {
    statusCode: 200,
    headersSent: false,
    get(name) { return headers.get(name.toLowerCase()); },
    set(name, value) { headers.set(name.toLowerCase(), value); return this; },
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    removeHeader(name) { headers.delete(name.toLowerCase()); },
    vary(value) { headers.set('vary', value); },
    json(body) {
      headers.set('content-type', 'application/json; charset=utf-8');
      this.send(Buffer.from(JSON.stringify(body)));
      return this;
    },
    send(body) { resolveSent({ body: Buffer.from(body), headers }); this.headersSent = true; return this; },
  };
  return { res, sent };
};

test('large JSON responses are gzip encoded only when the client accepts gzip', async () => {
  const req = { acceptsEncodings: (encoding) => encoding === 'gzip' };
  const { res, sent } = responseHarness();
  jsonCompression(req, res, () => {});
  res.json({ products: ['phone description '.repeat(150)] });

  const output = await sent;
  assert.equal(output.headers.get('content-encoding'), 'gzip');
  assert.equal(output.headers.get('vary'), 'Accept-Encoding');
  const decoded = JSON.parse(gunzipSync(output.body).toString('utf8'));
  assert.equal(decoded.products[0].startsWith('phone description'), true);
});

test('small JSON and clients without gzip continue through Express unchanged', async () => {
  const { res, sent } = responseHarness();
  jsonCompression({ acceptsEncodings: () => false }, res, () => {});
  res.json({ ok: true });
  const output = await sent;
  assert.equal(output.headers.has('content-encoding'), false);
  assert.equal(output.headers.get('vary'), 'Accept-Encoding');
  assert.deepEqual(JSON.parse(output.body.toString('utf8')), { ok: true });
});
