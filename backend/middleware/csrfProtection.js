import crypto from 'node:crypto';

const cookieOptions = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/'
};

const safeEqual = (left, right) => {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const issueCsrfToken = (req, res) => {
  const token = req.cookies?.csrfToken || crypto.randomBytes(32).toString('hex');
  if (!req.cookies?.csrfToken) res.cookie('csrfToken', token, cookieOptions);
  return token;
};

export const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (safeEqual(req.get('X-CSRF-Token'), req.cookies?.csrfToken)) return next();
  return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token.' });
};
