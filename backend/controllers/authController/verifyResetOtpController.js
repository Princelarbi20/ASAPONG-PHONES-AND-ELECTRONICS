import bcrypt from 'bcrypt';
import { Register } from '../../modules/userRegister.js';
import { PasswordResetOTP } from '../../modules/passwordResetOTP.js';
import { createResetAuthorization, hashResetSecret, RESET_AUTH_TTL_MS, verifyResetFlowId } from '../../utils/passwordReset.js';

export const verifyResetOtpController = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    if (!verifyResetFlowId(req.body.flowId, email)) {
      return res.status(400).json({ success: false, message: 'The code is invalid or expired. Request a new code and try again.' });
    }
    const user = await Register.findOne({ email, isVerified: true, isSuspended: false });
    const now = new Date();
    const record = user && await PasswordResetOTP.findOne({ userId: user._id }).select('+otpHash +flowIdHash');
    const flowIdHash = hashResetSecret(req.body.flowId);
    if (!record?.otpHash || record.flowIdHash !== flowIdHash || !record.flowIdExpiresAt || record.flowIdExpiresAt <= now || !record.otpExpiresAt || record.otpExpiresAt <= now || record.otpAttempts >= 5) {
      return res.status(400).json({ success: false, message: 'The code is invalid or expired. Request a new code and try again.' });
    }

    const valid = await bcrypt.compare(req.body.otp, record.otpHash);
    if (!valid) {
      await PasswordResetOTP.updateOne({ _id: record._id, otpHash: record.otpHash, flowIdHash, flowIdExpiresAt: { $gt: now }, otpExpiresAt: { $gt: now }, otpAttempts: { $lt: 5 } }, { $inc: { otpAttempts: 1 } });
      return res.status(400).json({ success: false, message: 'The code is invalid or expired. Request a new code and try again.' });
    }

    const resetAuthorization = createResetAuthorization();
    const authorizationHash = hashResetSecret(resetAuthorization);
    const updated = await PasswordResetOTP.findOneAndUpdate(
      { _id: record._id, otpHash: record.otpHash, flowIdHash, flowIdExpiresAt: { $gt: now }, otpExpiresAt: { $gt: now }, otpAttempts: { $lt: 5 } },
      { $set: { otpHash: null, otpExpiresAt: null, flowIdHash: null, flowIdExpiresAt: null, authorizationHash, authorizationExpiresAt: new Date(now.getTime() + RESET_AUTH_TTL_MS), expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) } },
      { new: true },
    );
    if (!updated) return res.status(400).json({ success: false, message: 'The code is invalid or expired. Request a new code and try again.' });
    return res.status(200).json({ success: true, message: 'Code verified.', resetAuthorization, authorizationExpiresAt: updated.authorizationExpiresAt });
  } catch (error) {
    console.error('Password reset code verification failed:', error?.message || 'Unknown error');
    return res.status(500).json({ success: false, message: 'Could not verify the code. Please try again.' });
  }
};
