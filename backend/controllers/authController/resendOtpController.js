import { randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { performance } from 'node:perf_hooks';
import { Register } from '../../modules/userRegister.js';
import { enqueueOtpEmail } from '../../utils/emailOutbox.js';
import { buildOtpEmail } from '../../utils/otpEmail.js';
import { getOtpExpiryMs, OTP_RESEND_COOLDOWN_MS } from '../../config/otp.js';

export const resendOtpController = async (req, res) => {
  const startedAt = performance.now();
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') return res.status(400).json({ success: false, message: 'Valid email is required.' });
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Register.findOne({ email: normalizedEmail }).select('+otp +otpVersion');
    if (!existing) return res.status(404).json({ success: false, message: 'User not found.' });
    if (existing.isVerified) return res.status(400).json({ success: false, message: 'Account is already verified.' });
    if (!existing.email) return res.status(400).json({ success: false, message: 'User does not have a registered email.' });

    const now = Date.now();
    const otp = randomInt(100000, 1000000).toString();
    const otpVersion = randomUUID();
    const otpHashStartedAt = performance.now();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiryMs = getOtpExpiryMs();
    const otpExpires = new Date(now + otpExpiryMs);
    const previous = { otp: existing.otp || null, otpExpires: existing.otpExpires || null, otpLastSentAt: existing.otpLastSentAt || null, otpVersion: existing.otpVersion || null };

    // Atomically reserve the cooldown and replace the code; concurrent resend
    // requests cannot queue multiple active messages for the same account.
    const user = await Register.findOneAndUpdate({
      _id: existing._id,
      isVerified: false,
      $or: [
        { otpLastSentAt: null },
        { otpLastSentAt: { $lte: new Date(now - OTP_RESEND_COOLDOWN_MS) } },
      ],
    }, {
      $set: { otp: hashedOtp, otpExpires, otpLastSentAt: new Date(now), otpVersion },
    }, { returnDocument: "after" }).select('+otpVersion');

    if (!user) {
      const lastSentAt = existing.otpLastSentAt?.getTime?.();
      const retryAfterSeconds = lastSentAt ? Math.max(1, Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - lastSentAt)) / 1000)) : 1;
      return res.status(429).json({ success: false, message: `Please wait ${retryAfterSeconds} seconds before requesting another OTP.`, retryAfterSeconds });
    }

    try {
      await enqueueOtpEmail({
        requestId: req.id, userId: user._id, otpVersion,
        message: { to: user.email, ...buildOtpEmail({ userName: user.userName, otp, expiresMinutes: Math.ceil(otpExpiryMs / 60000) }) },
      });
    } catch (queueError) {
      await Register.updateOne({ _id: user._id, otpVersion }, { $set: previous });
      throw queueError;
    }

    console.info('[performance] otp_resend', JSON.stringify({
      requestId: req.id,
      otpHashMs: Number((performance.now() - otpHashStartedAt).toFixed(1)),
      totalMs: Number((performance.now() - startedAt).toFixed(1)),
      result: 'queued',
    }));
    return res.status(200).json({
      success: true,
      message: 'Verification code queued for delivery.',
      otpExpiresAt: otpExpires.toISOString(),
      otpResendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_MS).toISOString(),
    });
  } catch (error) {
    console.error('[otp-resend] failed', JSON.stringify({ requestId: req.id, errorName: error?.name, errorCode: error?.code }));
    return res.status(500).json({ success: false, message: 'Unable to queue a verification code. Please try again.' });
  }
};
