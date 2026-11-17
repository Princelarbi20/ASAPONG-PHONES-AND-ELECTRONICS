import mongoose from 'mongoose';

const emailOutboxSchema = new mongoose.Schema({
  requestId: { type: String, index: true },
  kind: { type: String, enum: ['registration_otp', 'password_reset'], default: 'registration_otp', index: true },
  priority: { type: Number, default: 0 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
  otpVersion: { type: String, required: true },
  encryptedPayload: { type: String, required: true, select: false },
  status: { type: String, enum: ['pending', 'sending', 'sent', 'failed'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now },
  lockedAt: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  lastErrorCode: { type: String, default: null },
}, { timestamps: true });

emailOutboxSchema.index({ status: 1, nextAttemptAt: 1, priority: -1, createdAt: 1 });
emailOutboxSchema.index({ sentAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { status: 'sent' } });
emailOutboxSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { status: 'failed' } });

export const EmailOutbox = mongoose.models.EmailOutbox || mongoose.model('EmailOutbox', emailOutboxSchema);
