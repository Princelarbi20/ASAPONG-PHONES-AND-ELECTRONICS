import crypto from "crypto";
import { Orders } from "../../modules/orderSchema.js";
import { PaymentAttempt } from "../../modules/paymentAttemptSchema.js";
import { getPaystackConfig } from "../../utils/paystackConfig.js";

export const initializePaymentController = async (req, res) => {
  let attempt;
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required.",
      });
    }

    // Populate user to get the email
    const order = await Orders.findById(orderId).populate("user", "email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Ownership check
    if (!req.user || order.user._id.toString() !== String(req.user.id || req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden.",
      });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "This order has already been paid.",
      });
    }

    const email = order.user?.email;
    const wholeAmount = Math.round(Number(order.totalPrice));
    if (Number.isFinite(wholeAmount) && wholeAmount !== Number(order.totalPrice)) {
      order.totalPrice = wholeAmount;
      await order.save();
    }
    const amountInPesewas = wholeAmount * 100;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Customer email not found.",
      });
    }

    if (!Number.isFinite(amountInPesewas) || amountInPesewas <= 0) {
      return res.status(400).json({
        success: false,
        message: "Order has an invalid total.",
      });
    }

    const reference = `ORD-${order._id}-${crypto.randomBytes(4).toString("hex")}`;
    attempt = await PaymentAttempt.create({
      user: order.user._id,
      order: order._id,
      amount: wholeAmount,
      currency: "GHS",
      paymentMethod: "Paystack",
      provider: "Paystack",
      reference,
      status: "PENDING",
      metadata: { stage: "initialization" },
    });

    const config = getPaystackConfig();
    if (config.error) {
      await PaymentAttempt.findByIdAndUpdate(attempt._id, {
        $set: {
          status: "FAILED",
          gatewayResponse: "Payment service configuration error.",
          completedAt: new Date(),
        },
      });
      console.error("Paystack config error:", config.error);
      return res.status(500).json({
        success: false,
        message: "Server payment configuration error.",
      });
    }

    const frontendUrl = (process.env.CLIENT_URL || process.env.FRONTEND_ORIGIN || "http://localhost:5173")
      .trim()
      .replace(/\/+$/, "");

    const response = await fetch(`${config.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInPesewas,
        currency: "GHS",
        reference,
        callback_url: `${frontendUrl}/payment-success`,
        metadata: { orderId: order._id.toString() },
      }),
    });

    // Read as text first so empty or HTML error pages don't crash JSON parsing
    const responseText = await response.text();

    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error("Paystack raw non-JSON response:", responseText);
      await PaymentAttempt.findByIdAndUpdate(attempt._id, {
        $set: {
          status: "FAILED",
          gatewayResponse: "Paystack returned an invalid response.",
          metadata: { stage: "initialization", httpStatus: response.status },
          completedAt: new Date(),
        },
      });
      return res.status(502).json({
        success: false,
        message: "Received invalid response format from Paystack payment gateway.",
      });
    }

    if (!response.ok || !data.status) {
      // Shows exactly which key and URL the server used
      console.error("Paystack initialize failed:", {
        httpStatus: response.status,
        paystackMessage: data.message,
        keyUsed: config.masked,
        url: `${config.baseUrl}/transaction/initialize`,
      });

      await PaymentAttempt.findByIdAndUpdate(attempt._id, {
        $set: {
          status: "FAILED",
          gatewayResponse: data.message || "Failed to initialize payment.",
          metadata: { stage: "initialization", httpStatus: response.status },
          completedAt: new Date(),
        },
      });

      return res.status(response.ok ? 400 : response.status).json({
        success: false,
        message:
          data.message === "Invalid key"
            ? "Payment service key is invalid. Please contact support."
            : data.message || "Failed to initialize payment.",
      });
    }

    // Save the reference on the order and mark it pending
    const gatewayReference = data.data.reference || reference;
    await PaymentAttempt.findByIdAndUpdate(attempt._id, {
      $set: {
        reference: gatewayReference,
        metadata: { stage: "initialized", gatewayMessage: data.message },
      },
    });

    await Orders.findByIdAndUpdate(
      order._id,
      {
        $set: {
          paymentStatus: "PENDING",
          "paymentDetails.provider": "Paystack",
          "paymentDetails.reference": gatewayReference,
          "paymentDetails.currency": "GHS",
        },
      },
      { runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully.",
      data: data.data,
    });
  } catch (error) {
    console.error("Paystack Initialize Network/System Error:", error);

    if (attempt) {
      await PaymentAttempt.findByIdAndUpdate(attempt._id, {
        $set: {
          status: "FAILED",
          gatewayResponse: error.message || "Payment initialization failed.",
          metadata: { stage: "initialization" },
          completedAt: new Date(),
        },
      }).catch((updateError) => console.error("Could not update payment attempt:", updateError));
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during payment initialization.",
    });
  }
};
