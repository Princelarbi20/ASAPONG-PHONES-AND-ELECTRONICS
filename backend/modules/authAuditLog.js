import mongoose from 'mongoose';

const authAuditLogSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  accountType: { type: String, enum: ['USER', 'DEALER', 'UNKNOWN'], required: true },
  event: { type: String, enum: ['LOGIN_FAILED', 'LOGIN_BLOCKED', 'ACCOUNT_LOCKED'], required: true },
  ipAddress: { type: String, default: null },
  failedLoginAttempts: { type: Number, min: 0, max: 7, default: null },
  consecutiveLockouts: { type: Number, min: 0, default: null },
  remainingAttempts: { type: Number, min: 0, max: 6, default: null },
  lockUntil: { type: Date, default: null },
  lockDurationMinutes: { type: Number, min: 1, default: null },
  requestId: { type: String, maxlength: 80, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

authAuditLogSchema.index({ createdAt: -1 });
authAuditLogSchema.index({ ipAddress: 1, createdAt: -1 });

export const AuthAuditLog = mongoose.models.AuthAuditLog || mongoose.model('AuthAuditLog', authAuditLogSchema);
