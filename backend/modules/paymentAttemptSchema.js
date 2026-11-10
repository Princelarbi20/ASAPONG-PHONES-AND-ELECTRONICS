import mongoose from "mongoose";

const paymentAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Orders",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true },
    paymentMethod: { type: String, default: "Paystack", trim: true },
    serviceProvider: { type: String, trim: true },
    provider: { type: String, required: true, default: "Paystack", trim: true },
    reference: { type: String, required: true, unique: true, index: true, trim: true },
    transactionId: { type: String, index: true, sparse: true },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESSFUL", "FAILED", "REFUNDED", "ABANDONED"],
      default: "PENDING",
      index: true,
    },
    gatewayStatus: String,
    gatewayResponse: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: undefined },
    completedAt: Date,
  },
  { timestamps: true }
);

paymentAttemptSchema.index({ createdAt: -1 });

export const PaymentAttempt = mongoose.model("PaymentAttempt", paymentAttemptSchema);
