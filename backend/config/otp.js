const DEFAULT_OTP_EXPIRY_MS = 15 * 60 * 1000;

export const getOtpExpiryMs = () => {
  const configuredExpiry = process.env.OTP_EXPIRE_TIME;
  if (configuredExpiry === undefined || configuredExpiry.trim() === '') return DEFAULT_OTP_EXPIRY_MS;

  const expiryMs = Number(configuredExpiry);
  if (!Number.isSafeInteger(expiryMs) || expiryMs <= 0) {
    throw new Error('OTP_EXPIRE_TIME must be a positive integer number of milliseconds.');
  }
  return expiryMs;
};

export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
