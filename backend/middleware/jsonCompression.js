import { gzip } from 'node:zlib';

const MIN_COMPRESS_BYTES = 1024;

// Compress large JSON responses without adding a runtime dependency. Static
// assets and streamed responses are handled by the deployment proxy instead.
export const jsonCompression = (req, res, next) => {
  res.vary('Accept-Encoding');
  if (typeof req.acceptsEncodings !== 'function' || !req.acceptsEncodings('gzip')) return next();

  const sendBody = res.send.bind(res);
  res.send = (body) => {
    const contentType = res.get('Content-Type') || '';
    if (res.headersSent || res.statusCode < 200 || res.statusCode >= 300 || res.statusCode === 204
      || res.get('Content-Encoding') || !contentType.toLowerCase().includes('application/json')) {
      return sendBody(body);
    }

    const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
    if (payload.length < MIN_COMPRESS_BYTES) return sendBody(body);

    gzip(payload, (error, compressed) => {
      if (error) return sendBody(body);
      res.vary('Accept-Encoding');
      res.set('Content-Type', 'application/json; charset=utf-8');
      res.set('Content-Encoding', 'gzip');
      res.removeHeader('Content-Length');
      sendBody(compressed);
    });
    return res;
  };
  return next();
};
