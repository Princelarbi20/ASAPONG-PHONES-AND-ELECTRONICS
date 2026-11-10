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
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        image: { type: String },
        price: { type: Number, required: true },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1 unit"],
        },
      },
    ],

    totalPrice: {
      type: Number,
      required: true,
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
      reference: { type: String, index: true, unique: true, sparse: true },
      transactionId: String,
      amount: Number,
      currency: String,
      channel: String,
      serviceProvider: String,
      gatewayResponse: String,
      paystackStatus: String,
      paidAt: Date,
    },

    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      postalCode: { type: String, required: true },
    },
  },
  {
    timestamps: true,
  }
);

export const Orders = mongoose.model("Orders", orderSchema);
