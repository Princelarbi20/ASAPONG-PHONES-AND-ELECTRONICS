import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { Register } from '../../modules/userRegister.js';
import { PasswordResetOTP } from '../../modules/passwordResetOTP.js';
import { enqueuePasswordResetEmail, wakeEmailOutboxWorker } from '../../utils/emailOutbox.js';
import { createResetOtp, hashResetSecret, RESET_OTP_TTL_MS, RESET_REQUESTS_PER_WINDOW, RESET_REQUEST_WINDOW_MS, getPasswordResetOtpEmail, verifyResetFlowId } from '../../utils/passwordReset.js';

export const resendResetOtpController = async (req, res) => {
  const startedAt = performance.now();
  try {
    const email = req.body.email.toLowerCase().trim();
    if (!verifyResetFlowId(req.body.flowId, email)) {
      return res.status(200).json({ success: true, message: 'If an active password reset exists, a new verification code has been sent.' });
    }
    const generic = { success: true, message: 'If an active password reset exists, a new verification code has been sent.' };
    const user = await Register.findOne({ email, isVerified: true, isSuspended: false });
    if (!user) return res.status(200).json(generic);
    const now = new Date();
    const record = await PasswordResetOTP.findOne({ userId: user._id }).select('+otpHash +authorizationHash +flowIdHash');
    if (!record || record.flowIdHash !== hashResetSecret(req.body.flowId) || !record.flowIdExpiresAt || record.flowIdExpiresAt <= now) return res.status(200).json(generic);
    const windowStartedAt = record.requestWindowStartedAt || now;
    const sameWindow = now - windowStartedAt < RESET_REQUEST_WINDOW_MS;
    if (sameWindow && record.requestCount >= RESET_REQUESTS_PER_WINDOW) return res.status(200).json(generic);

    const otp = createResetOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const filter = { _id: record._id, otpHash: record.otpHash };
    const update = { $set: { otpHash, otpExpiresAt: new Date(now.getTime() + RESET_OTP_TTL_MS), otpAttempts: 0, authorizationHash: null, authorizationExpiresAt: null, requestWindowStartedAt: sameWindow ? windowStartedAt : now, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) } };
    if (sameWindow) {
      filter.requestCount = { $lt: RESET_REQUESTS_PER_WINDOW };
      filter.requestWindowStartedAt = windowStartedAt;
      update.$inc = { requestCount: 1 };
    } else {
      filter.requestWindowStartedAt = record.requestWindowStartedAt;
      update.$set.requestCount = 1;
    }
    const updated = await PasswordResetOTP.findOneAndUpdate(filter, update, { returnDocument: "after" });
    if (!updated) {
      return res.status(200).json(generic);
    }
    const verificationUrl = new URL('/auth/verify-reset-otp', (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',')[0].trim());
    verificationUrl.hash = new URLSearchParams({ flowId: req.body.flowId }).toString();
    try {
      await enqueuePasswordResetEmail({
        requestId: randomUUID(),
        userId: user._id,
        otpHash,
        message: {
          to: user.email,
          subject: 'Your new Asa Phones password reset code',
          text: `Your password reset code is ${otp}. It expires in 5 minutes. Do not share this code.\n${verificationUrl}`,
          html: getPasswordResetOtpEmail({ userName: user.userName || 'Customer', otp, expiresMinutes: 5, verificationUrl: verificationUrl.toString() }),
        },
      });
      if (process.env.NODE_ENV !== 'test') wakeEmailOutboxWorker();
    } catch (queueError) {
      await PasswordResetOTP.updateOne(
        { _id: record._id, otpHash },
        { $set: {
          otpHash: record.otpHash,
          otpExpiresAt: record.otpExpiresAt,
          otpAttempts: record.otpAttempts,
          authorizationHash: record.authorizationHash,
          authorizationExpiresAt: record.authorizationExpiresAt,
          requestCount: record.requestCount,
          requestWindowStartedAt: record.requestWindowStartedAt,
          expiresAt: record.expiresAt,
        } },
      );
      throw queueError;
    }
    console.info('[performance] password_reset_resend', JSON.stringify({ requestId: req.id, result: 'email_queued', totalMs: Number((performance.now() - startedAt).toFixed(1)) }));
    return res.status(200).json(generic);
  } catch (error) {
    console.error('[password-reset] resend_failed', JSON.stringify({ requestId: req.id, errorCode: error?.code || error?.name || 'request_failed' }));
    return res.status(200).json({ success: true, message: 'If an active password reset exists, a new verification code has been sent.' });
  }
};
