import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    // Human-friendly 6-digit order number shown to customers
    orderNumber: {
      type: Number,
      unique: true,
      sparse: true, // existing orders without a number don't conflict
      min: 100000,
      max: 999999,
      validate: Number.isInteger,
    },

    customerType: { type: String, enum: ["REGISTERED", "GUEST"], default: "REGISTERED" },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required() { return this.customerType !== "GUEST"; },
      index: true,
    },
    customerName: { type: String, trim: true, maxlength: 80 },
    customerEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
        image: { type: String, maxlength: 2048 },
        price: { type: Number, required: true, min: 0, max: 100000000, validate: Number.isInteger },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1 unit"],
          max: 1000,
          validate: Number.isInteger,
        },
      },
    ],

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
      max: 100000000,
      validate: Number.isInteger,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "PACKED",
        "SHIPPED",
        "OUT FOR DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "RETURN REQUESTED",
        "RETURNED",
        "REFUNDED",
      ],
      default: "PENDING",
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "ABANDONED", "REVERSED"],
      default: "PENDING",
    },

    paymentDetails: {
      provider: String,
      reference: { type: String, index: true, unique: true, sparse: true, maxlength: 120 },
      transactionId: { type: String, maxlength: 120 },
      amount: Number,
      currency: String,
      channel: String,
      serviceProvider: String,
      gatewayResponse: String,
      paystackStatus: String,
      paidAt: Date,
    },

    shippingAddress: {
      address: { type: String, required: true, trim: true, maxlength: 200 },
      city: { type: String, required: true, trim: true, maxlength: 100 },
      state: { type: String, required: true, trim: true, maxlength: 100 },
      country: { type: String, required: true, trim: true, maxlength: 100 },
      postalCode: { type: String, required: true, trim: true, maxlength: 30 },
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ createdAt: -1, _id: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ totalPrice: 1, _id: 1 });

export const Orders = mongoose.model("Orders", orderSchema);
