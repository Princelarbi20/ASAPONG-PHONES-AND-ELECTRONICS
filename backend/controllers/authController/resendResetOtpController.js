import bcrypt from 'bcrypt';
import { Register } from '../../modules/userRegister.js';
import { PasswordResetOTP } from '../../modules/passwordResetOTP.js';
import sendEmail from '../../utils/nodemailer.js';
import { escapeHtml } from '../../utils/escapeHtml.js';
import { createResetOtp, hashResetSecret, RESET_OTP_TTL_MS, RESET_REQUESTS_PER_WINDOW, RESET_REQUEST_WINDOW_MS, getPasswordResetOtpEmail, verifyResetFlowId } from '../../utils/passwordReset.js';

export const resendResetOtpController = async (req, res) => {
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
    const result = await sendEmail({ to: user.email, subject: 'Your new Asa Phones password reset code', text: `Your password reset code is ${otp}. It expires in 5 minutes. Do not share this code.`, html: getPasswordResetOtpEmail({ userName: escapeHtml(user.userName), otp, expiresMinutes: 5 }) });
    // Do not invalidate the current code or consume a resend slot until the
    // mail provider has accepted the new code. Otherwise a transient email
    // failure leaves the user with no usable code while this endpoint still
    // returns its privacy-preserving generic response.
    if (!result?.success) {
      console.error('Password reset email delivery failed.');
      return res.status(200).json(generic);
    }
    const updated = await PasswordResetOTP.findOneAndUpdate(filter, update, { new: true });
    if (!updated) {
      console.error('Password reset resend state changed before the new code could be saved.');
      return res.status(200).json(generic);
    }
    return res.status(200).json(generic);
  } catch (error) {
    console.error('Password reset resend failed:', error?.message || 'Unknown error');
    return res.status(200).json({ success: true, message: 'If an active password reset exists, a new verification code has been sent.' });
  }
};
