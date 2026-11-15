import mongoose from "mongoose";

const emailOutboxSchema = new mongoose.Schema({
  requestId: { type: String, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true, index: true },
  otpHash: { type: String, required: true, select: false },
  encryptedPayload: { type: String, required: true, select: false },
  status: { type: String, enum: ["pending", "sending", "sent", "failed"], default: "pending", index: true },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now, index: true },
  lockedAt: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  lastError: { type: String, default: null, select: false },
}, { timestamps: true });

emailOutboxSchema.index({ status: 1, nextAttemptAt: 1 });

export const EmailOutbox = mongoose.models.EmailOutbox || mongoose.model("EmailOutbox", emailOutboxSchema);
