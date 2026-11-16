import mongoose from 'mongoose';

const paystackRefundSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Orders', required: true, index: true },
  paymentAttempt: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentAttempt', required: true, unique: true },
  transactionReference: { type: String, required: true, trim: true, maxlength: 120, index: true },
  transactionId: { type: String, required: true, trim: true, maxlength: 32 },
  reference: { type: String, required: true, trim: true, minlength: 8, maxlength: 64, unique: true },
  amount: { type: Number, required: true, min: 1, validate: Number.isInteger }, // Paystack subunits (pesewas)
  currency: { type: String, required: true, uppercase: true, trim: true, maxlength: 3 },
  reason: { type: String, required: true, enum: ['LATE_PAYMENT', 'CANCELLED_ORDER', 'EXPIRED_ORDER', 'PAYMENT_MISMATCH', 'DUPLICATE_CHARGE', 'ADMIN_REQUEST'] },
  status: { type: String, required: true, enum: ['REQUESTED', 'PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'NEEDS_ATTENTION'], default: 'REQUESTED', index: true },
  providerStatus: { type: String, trim: true },
  providerRefundId: { type: String, trim: true, maxlength: 32 },
  providerResponse: { type: String, maxlength: 1000 },
  lastCheckedAt: Date,
  processedAt: Date,
}, { timestamps: true });

paystackRefundSchema.index({ status: 1, updatedAt: 1 });
paystackRefundSchema.index({ transactionReference: 1, status: 1 });

export const PaystackRefund = mongoose.model('PaystackRefund', paystackRefundSchema);
