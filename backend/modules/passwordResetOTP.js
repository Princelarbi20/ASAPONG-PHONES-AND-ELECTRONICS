import mongoose from 'mongoose';

const passwordResetOTPSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true, unique: true, index: true },
  otpHash: { type: String, default: null, select: false },
  otpExpiresAt: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
  flowIdHash: { type: String, default: null, select: false },
  flowIdExpiresAt: { type: Date, default: null },
  authorizationHash: { type: String, default: null, select: false },
  authorizationExpiresAt: { type: Date, default: null },
  requestCount: { type: Number, default: 0 },
  requestWindowStartedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
}, { timestamps: true });

passwordResetOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetOTP = mongoose.model('PasswordResetOTP', passwordResetOTPSchema);
