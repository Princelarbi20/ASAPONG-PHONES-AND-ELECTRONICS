import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const RESET_OTP_TTL_MS = 5 * 60 * 1000;
export const RESET_AUTH_TTL_MS = 10 * 60 * 1000;
export const RESET_FLOW_TTL_MS = 10 * 60 * 1000;
export const RESET_REQUEST_WINDOW_MS = 60 * 60 * 1000;
export const RESET_REQUESTS_PER_WINDOW = 4;

export const createResetOtp = () => randomInt(100000, 1000000).toString();
export const createResetAuthorization = () => randomBytes(32).toString('base64url');
export const hashResetSecret = (value) => createHash('sha256').update(value).digest('hex');

const getResetFlowSecret = () => {
  const secret = process.env.RESET_FLOW_SECRET || process.env.REFRESH_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error('A reset flow signing secret of at least 32 characters is required.');
  return secret;
};

const signResetFlowPayload = (payload) => createHmac('sha256', getResetFlowSecret()).update(payload).digest('base64url');

export const createResetFlowId = (email, now = Date.now()) => {
  const emailHash = createHash('sha256').update(email.trim().toLowerCase()).digest('base64url');
  const payload = Buffer.from(JSON.stringify({ emailHash, issuedAt: now, nonce: randomBytes(16).toString('base64url') })).toString('base64url');
  return `${payload}.${signResetFlowPayload(payload)}`;
};

export const verifyResetFlowId = (flowId, email, now = Date.now()) => {
  if (typeof flowId !== 'string' || flowId.length > 512 || typeof email !== 'string') return false;
  const [payload, suppliedSignature, ...extra] = flowId.split('.');
  if (!payload || !suppliedSignature || extra.length) return false;
  let expectedSignature;
  let claims;
  try {
    expectedSignature = Buffer.from(signResetFlowPayload(payload), 'base64url');
    const supplied = Buffer.from(suppliedSignature, 'base64url');
    if (supplied.length !== expectedSignature.length || !timingSafeEqual(supplied, expectedSignature)) return false;
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return false;
  }
  const emailHash = createHash('sha256').update(email.trim().toLowerCase()).digest('base64url');
  return Number.isSafeInteger(claims.issuedAt) && claims.issuedAt <= now && now - claims.issuedAt <= RESET_FLOW_TTL_MS &&
    typeof claims.nonce === 'string' && /^[A-Za-z0-9_-]{20,30}$/.test(claims.nonce) && claims.emailHash === emailHash;
};

export const getPasswordResetOtpEmail = ({ userName, otp, expiresMinutes }) => `
  <!doctype html><html><body style="margin:0;background:#f4f6f9;font-family:Arial,sans-serif;color:#111827">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border:1px solid #e5e7eb;border-radius:14px">
        <tr><td style="padding:28px 28px 8px;text-align:center"><strong style="font-size:22px;color:#4f46e5">Asa Phones</strong></td></tr>
        <tr><td style="padding:20px 28px 30px;text-align:center">
          <h1 style="font-size:22px;margin:0 0 14px">Reset your password</h1>
          <p style="font-size:14px;line-height:1.6;color:#4b5563">Hello ${userName}, use this verification code to continue resetting your Asa Phones password.</p>
          <div style="margin:24px 0;padding:18px;background:#f3f4f6;border-radius:8px;font:700 32px monospace;letter-spacing:8px;color:#4338ca">${otp}</div>
          <p style="font-size:13px;color:#6b7280">This code expires in <strong>${expiresMinutes} minutes</strong>.</p>
          <p style="font-size:12px;color:#9ca3af">Never share this code. If you did not request a password reset, you can ignore this email.</p>
        </td></tr>
        <tr><td style="padding:16px;text-align:center;background:#f9fafb;color:#9ca3af;font-size:11px">© ${new Date().getFullYear()} Asa Phones</td></tr>
      </table>
    </td></tr></table>
  </body></html>`;

export const getPasswordChangedEmail = ({ userName, changedAt }) => `
  <!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827">
    <div style="max-width:520px;margin:32px auto;padding:28px;border:1px solid #e5e7eb;border-radius:14px">
      <strong style="font-size:22px;color:#4f46e5">Asa Phones</strong><h1 style="font-size:22px">Password changed</h1>
      <p>Hello ${userName}, your Asa Phones account password was changed on ${changedAt}.</p>
      <p>If you did not make this change, contact Asa Phones support immediately.</p>
    </div>
  </body></html>`;
