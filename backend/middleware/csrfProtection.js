import crypto from 'node:crypto';
import { isTrustedOrigin } from '../config/trustedOrigins.js';

const cookieOptions = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/'
};

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const getSigningSecret = () => process.env.CSRF_SECRET || process.env.REFRESH_TOKEN_SECRET;

const createSignedToken = () => {
  const issuedAt = Date.now().toString(36);
  const nonce = crypto.randomBytes(32).toString('hex');
  const payload = `${issuedAt}.${nonce}`;
  const signature = crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const isValidSignedToken = (token) => {
  if (typeof token !== 'string') return false;
  const [issuedAt, nonce, signature, ...extra] = token.split('.');
  if (!issuedAt || !nonce || !signature || extra.length) return false;
  const issuedAtMs = Number.parseInt(issuedAt, 36);
  if (!Number.isFinite(issuedAtMs) || issuedAtMs > Date.now() || Date.now() - issuedAtMs > TOKEN_TTL_MS) return false;

  const payload = `${issuedAt}.${nonce}`;
  const expected = crypto.createHmac('sha256', getSigningSecret()).update(payload).digest();
  let supplied;
  try {
    supplied = Buffer.from(signature, 'base64url');
  } catch {
    return false;
  }
  return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
};

const safeEqual = (left, right) => {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const issueCsrfToken = (req, res) => {
  const token = createSignedToken();
  res.cookie('csrfToken', token, cookieOptions);
  return token;
};

export const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('Origin');
  if (origin && !isTrustedOrigin(origin)) {
    return res.status(403).json({ success: false, message: 'Request origin is not allowed.' });
  }
  const token = req.get('X-CSRF-Token');
  if (safeEqual(token, req.cookies?.csrfToken) || isValidSignedToken(token)) return next();
  return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token.' });
};
