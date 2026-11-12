import mongoose from "mongoose";

const paymentAttemptSchema = new mongoose.Schema(
  {
    customerType: { type: String, enum: ["REGISTERED", "GUEST"], default: "REGISTERED" },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required() { return this.customerType !== "GUEST"; },
      index: true,
    },
    customerName: { type: String, trim: true, maxlength: 80 },
    customerEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Orders",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 1, max: 100000000, validate: Number.isInteger },
    currency: { type: String, required: true, enum: ["GHS"], uppercase: true, trim: true },
    paymentMethod: { type: String, enum: ["Paystack", "card", "mobile_money", "ussd", "bank", "bank_transfer", "eft", "qr", "apple_pay", "google_pay"], default: "Paystack", trim: true },
    serviceProvider: { type: String, trim: true },
    provider: { type: String, required: true, default: "Paystack", trim: true },
    reference: { type: String, required: true, unique: true, index: true, trim: true, minlength: 8, maxlength: 120 },
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
