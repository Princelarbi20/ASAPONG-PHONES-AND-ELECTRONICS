import mongoose from 'mongoose';

const orderNotificationOutboxSchema = new mongoose.Schema({
  eventKey: { type: String, required: true, unique: true, trim: true, maxlength: 180 },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Orders', required: true, index: true },
  type: { type: String, required: true, enum: ['COD_CONFIRMATION', 'PAYMENT_CONFIRMATION', 'STATUS_UPDATE'], index: true },
  encryptedPayload: { type: String, required: true, select: false },
  status: { type: String, required: true, enum: ['pending', 'sending', 'sent', 'failed'], default: 'pending', index: true },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now },
  lockedAt: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  providerMessageId: { type: String, maxlength: 120 },
  lastErrorCode: { type: String, maxlength: 100 },
}, { timestamps: true });

orderNotificationOutboxSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
orderNotificationOutboxSchema.index({ sentAt: 1 }, {
  expireAfterSeconds: 90 * 24 * 60 * 60,
  partialFilterExpression: { status: 'sent' },
});
orderNotificationOutboxSchema.index({ updatedAt: 1 }, {
  expireAfterSeconds: 30 * 24 * 60 * 60,
  partialFilterExpression: { status: 'failed' },
});

export const OrderNotificationOutbox = mongoose.models.OrderNotificationOutbox
  || mongoose.model('OrderNotificationOutbox', orderNotificationOutboxSchema);
