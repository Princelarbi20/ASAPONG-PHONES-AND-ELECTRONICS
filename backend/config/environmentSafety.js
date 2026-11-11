const isTest = () => process.env.NODE_ENV === 'test';

export const getDatabaseUri = () => {
  if (!isTest()) return process.env.MONGO_URI;

  const uri = process.env.TEST_MONGO_URI?.trim();
  if (!uri) throw new Error('TEST_MONGO_URI is required in test mode.');
  let parsed;
  try { parsed = new URL(uri); } catch { throw new Error('TEST_MONGO_URI must be a valid MongoDB URI.'); }
  const dbName = parsed.pathname.replace(/^\//, '');
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol) || !/(^|[_-])test($|[_-])/i.test(dbName)) {
    throw new Error('Test database URI must use a database name containing a distinct test marker (for example asapong_test).');
  }
  if (uri === process.env.MONGO_URI) throw new Error('Test database must be separate from MONGO_URI.');
  const productionHost = (() => { try { return new URL(process.env.MONGO_URI).host.toLowerCase(); } catch { return ''; } })();
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  if (!localHosts.has(parsed.hostname.toLowerCase())) {
    const allowedHosts = new Set((process.env.TEST_MONGO_HOST_ALLOWLIST || '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean));
    if (!allowedHosts.has(parsed.host.toLowerCase()) || parsed.host.toLowerCase() === productionHost) {
      throw new Error('Remote TEST_MONGO_URI host must be explicitly listed in TEST_MONGO_HOST_ALLOWLIST and differ from the production host.');
    }
  }
  return uri;
};

export const assertTestEnvironment = () => {
  if (!isTest()) return;
  getDatabaseUri();
  for (const name of ['TEST_ACCESS_TOKEN_SECRET', 'TEST_REFRESH_TOKEN_SECRET']) {
    if (!process.env[name] || process.env[name].length < 32) throw new Error(`${name} must be at least 32 characters in test mode.`);
  }
  process.env.ACCESS_TOKEN_SECRET = process.env.TEST_ACCESS_TOKEN_SECRET;
  process.env.REFRESH_TOKEN_SECRET = process.env.TEST_REFRESH_TOKEN_SECRET;
  if (!/^sk_test_[A-Za-z0-9]+$/.test(process.env.PAYSTACK_SECRET_KEY || '')) throw new Error('Test mode requires a sandbox Paystack secret (sk_test_...).');
  if (!/^https:\/\/api\.paystack\.co\/?$/.test(process.env.PAYSTACK_BASE_URL || '')) throw new Error('Test mode requires the Paystack sandbox API host.');
  if (!['1', 'true'].includes(String(process.env.EMAIL_SINK || '').toLowerCase())) throw new Error('Test mode requires EMAIL_SINK=true to prevent real email delivery.');
  if (process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_SECRET) throw new Error('Cloudinary credentials are forbidden in test mode; use isolated local test uploads.');
};

export { isTest };
