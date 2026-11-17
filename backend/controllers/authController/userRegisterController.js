import bcrypt from 'bcrypt';
import { randomInt, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { Register } from '../../modules/userRegister.js';
import { getOtpExpiryMs, OTP_RESEND_COOLDOWN_MS } from '../../config/otp.js';
import { buildOtpEmail } from '../../utils/otpEmail.js';
import { enqueueOtpEmail } from '../../utils/emailOutbox.js';
import { CACHE_NAMESPACES, invalidateCacheNamespace } from '../../utils/responseCache.js';
import { hashPassword } from '../../utils/passwordHash.js';
import { isValidPassword } from '../../shared/passwordPolicy.js';

export const userRegisterController = async (req, res) => {
  const requestStartedAt = performance.now();
  const timings = {};
  const measure = async (name, operation) => {
    const startedAt = performance.now();
    try { return await operation(); }
    finally { timings[name] = Number((performance.now() - startedAt).toFixed(1)); }
  };
  const logPerformance = (result) => console.info('[performance] registration', JSON.stringify({
    requestId: req.id, result, ...timings,
    totalMs: Number((performance.now() - requestStartedAt).toFixed(1)),
  }));

  try {
    const { userName, email, phone, password } = req.body;
    if (!userName || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All fields (username, email, phone, and password) are required.' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(userName)) {
      return res.status(400).json({ success: false, message: 'Name validation failed. Names cannot contain symbols or numbers.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('233') && cleanPhone.length === 12) cleanPhone = `0${cleanPhone.slice(3)}`;
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Phone verification failure. Contact number must be 10 digits long.' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must be 8–128 characters and cannot be a commonly used password.' });
    }

    const otpStartedAt = performance.now();
    const otp = randomInt(100000, 1000000).toString();
    const otpVersion = randomUUID();
    timings.otpGenerationMs = Number((performance.now() - otpStartedAt).toFixed(1));
    const [hashedPassword, hashOtp] = await Promise.all([
      measure('passwordHashMs', () => hashPassword(password, 10)),
      measure('otpHashMs', () => bcrypt.hash(otp, 10)),
    ]);
    const otpExpiryMs = getOtpExpiryMs();
    const otpExpires = new Date(Date.now() + otpExpiryMs);
    const user = new Register({
      userName: userName.trim(), email: normalizedEmail, phone: cleanPhone,
      password: hashedPassword, role: 'USER', isSuspended: false,
      isVerified: false, cart: [], otp: hashOtp, otpExpires,
      otpLastSentAt: new Date(), otpVersion,
    });

    await measure('databaseCreateMs', () => user.save());
    try {
      await measure('emailQueueWriteMs', () => enqueueOtpEmail({
        requestId: req.id, userId: user._id, otpVersion,
        message: { to: user.email, ...buildOtpEmail({ userName: user.userName, otp, expiresMinutes: Math.ceil(otpExpiryMs / 60000) }) },
      }));
    } catch (queueError) {
      await Register.deleteOne({ _id: user._id });
      throw queueError;
    }
    await invalidateCacheNamespace(CACHE_NAMESPACES.adminUsers);

    logPerformance('created_email_queued');
    return res.status(201).json({
      success: true,
      message: 'Registration successful. Your verification code is queued for delivery.',
      accountType: 'USER', otpExpiresAt: otpExpires.toISOString(),
      otpResendAvailableAt: new Date(Date.now() + OTP_RESEND_COOLDOWN_MS).toISOString(),
      user: { id: user._id, userName: user.userName, email: user.email, phone: user.phone, role: user.role, isVerified: user.isVerified },
    });
  } catch (error) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || error.keyValue || {})[0];
      logPerformance('duplicate');
      return res.status(409).json({ success: false, message: field === 'phone' ? 'This phone number is already registered.' : 'This email address is already registered.' });
    }
    console.error('[registration] failed', JSON.stringify({ requestId: req.id, errorName: error?.name, errorCode: error?.code }));
    logPerformance('failed');
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
};
