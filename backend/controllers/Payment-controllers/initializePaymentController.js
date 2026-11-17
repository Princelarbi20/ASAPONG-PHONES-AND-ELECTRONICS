import crypto from "crypto";
import { Orders } from "../../modules/orderSchema.js";
import { PaymentAttempt } from "../../modules/paymentAttemptSchema.js";
import { Register } from "../../modules/userRegister.js";
import { getPaystackConfig } from "../../utils/paystackConfig.js";
import { CACHE_NAMESPACES, invalidateCacheNamespaces } from "../../utils/responseCache.js";

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

    // Populate the customer snapshot; retain the reference as a fallback for older orders.
    const order = await Orders.findById(orderId).populate("user", "userName email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const orderUserId = order.user?._id || order.user;
    if (!orderUserId || !req.user || String(orderUserId) !== String(req.user.id || req.user._id)) {
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

    if (order.status === "CANCELLED") {
      return res.status(409).json({
        success: false,
        message: "This order has been cancelled and cannot be paid.",
      });
    }

    if (order.status === 'EXPIRED' || (order.paymentMethod === 'ONLINE' && order.expiresAt && order.expiresAt <= new Date())) {
      return res.status(409).json({ success: false, message: 'This order has expired and cannot be paid.' });
    }

    if (!["PENDING", "FAILED", "ABANDONED"].includes(order.paymentStatus)) {
      return res.status(409).json({
        success: false,
        message: "This order is not eligible for a payment attempt.",
      });
    }

    const customer = order.user?.email ? order.user : await Register.findById(orderUserId).select("userName email");
    const email = customer?.email || order.customerEmail;
    const wholeAmount = Math.round(Number(order.totalPrice));
    if (Number.isFinite(wholeAmount) && wholeAmount !== Number(order.totalPrice)) {
      order.totalPrice = wholeAmount;
      await order.save();
      await invalidateCacheNamespaces(CACHE_NAMESPACES.adminOrders, CACHE_NAMESPACES.userOrders);
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
      customerType: order.customerType || 'REGISTERED',
      user: orderUserId,
      customerName: customer?.userName || order.customerName,
      customerEmail: email,
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

    const frontendUrl = (process.env.CLIENT_URL || process.env.FRONTEND_ORIGIN)
      .trim()
      .replace(/\/+$/, "");

    const response = await fetch(`${config.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
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

    const updatedOrder = await Orders.findOneAndUpdate(
      {
        _id: order._id,
        status: { $nin: ["CANCELLED", "EXPIRED"] },
        paymentStatus: { $ne: "PAID" },
        $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: { $exists: false } }],
      },
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
    if (!updatedOrder) {
      const latestOrder = await Orders.findById(order._id).select("status paymentStatus expiresAt");
      const wasPaid = latestOrder?.paymentStatus === "PAID";
      const wasCancelled = latestOrder?.status === "CANCELLED";
      const wasExpired = latestOrder?.status === 'EXPIRED' || (latestOrder?.expiresAt && latestOrder.expiresAt <= new Date());
      await PaymentAttempt.findByIdAndUpdate(attempt._id, {
        $set: {
          status: "FAILED",
          gatewayResponse: wasPaid
            ? "Order was paid while payment was being initialized."
            : wasExpired ? "Order expired while payment was being initialized." : "Order was cancelled while payment was being initialized.",
          metadata: { stage: "initialization", reason: wasPaid ? "ORDER_ALREADY_PAID" : wasExpired ? "ORDER_EXPIRED" : "ORDER_CANCELLED" },
          completedAt: new Date(),
        },
      });
      return res.status(wasPaid ? 400 : 409).json({
        success: false,
        message: wasPaid
          ? "This order has already been paid."
          : wasCancelled || wasExpired
            ? `This order was ${wasExpired ? 'expired' : 'cancelled'} and cannot be paid.`
            : "This order changed while payment was being initialized. Please refresh and try again.",
      });
    }
    await invalidateCacheNamespaces(CACHE_NAMESPACES.adminOrders, CACHE_NAMESPACES.userOrders);

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully.",
      data: data.data,
    });
  } catch (error) {
    console.error("Paystack Initialize Network/System Error:", error);
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';

    if (attempt) {
      await PaymentAttempt.findByIdAndUpdate(attempt._id, {
        $set: {
          status: "FAILED",
          gatewayResponse: timedOut ? "Paystack initialization request timed out." : (error.message || "Payment initialization failed."),
          metadata: { stage: "initialization", ...(timedOut ? { reason: 'PROVIDER_TIMEOUT' } : {}) },
          completedAt: new Date(),
        },
      }).catch((updateError) => console.error("Could not update payment attempt:", updateError));
    }

    return res.status(timedOut ? 504 : 500).json({
      success: false,
      message: timedOut
        ? "The payment service took too long to respond. Check your order status before trying again."
        : "Internal server error during payment initialization.",
    });
  }
};
