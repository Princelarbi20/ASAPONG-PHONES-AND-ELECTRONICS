import { escapeHtml } from './escapeHtml.js';

export const buildOtpEmail = ({ userName, otp, expiresMinutes }) => ({
  subject: 'Verify your account',
  text: `Hello, ${userName}. Your verification code is ${otp}. It expires in ${expiresMinutes} minutes.`,
  html: `<!doctype html><html><body style="margin:0;padding:32px;background:#f4f6f9;font-family:Arial,sans-serif"><table role="presentation" align="center" width="100%" style="max-width:480px;background:#fff;border:1px solid #e5e7eb;border-radius:12px"><tr><td align="center" style="padding:32px"><img src="${escapeHtml(process.env.CLOUDINARY_LOG || '')}" alt="Asapong" style="max-height:55px"><h2>Hello, ${escapeHtml(userName)}!</h2><p>Use this one-time code to verify your account:</p><div style="font:bold 32px monospace;letter-spacing:6px;color:#4f46e5"><span>${otp}</span></div><p>This code expires in ${expiresMinutes} minutes.</p><p style="color:#9ca3af;font-size:12px">If you did not request this code, you can ignore this email.</p></td></tr></table></body></html>`,
});
