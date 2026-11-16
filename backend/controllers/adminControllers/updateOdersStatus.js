import mongoose from "mongoose";
import { Orders } from "../../modules/orderSchema.js";
import { Product } from "../../modules/productSchema.js";
import { buildOrderStatusEmail } from "../../utils/orderStatusEmail.js";
import sendEmail from "../../utils/nodemailer.js";
import { canTransitionOrderStatus } from "../../utils/orderStatusTransitions.js";
import { CACHE_NAMESPACES, invalidateCacheNamespaces } from "../../utils/responseCache.js";

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

export const updateOrderStatusController = async (req, res, next) => {
  const session = await mongoose.startSession();
  let changed = false;
  let previousStatus;
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = Orders.schema.path("status").enumValues;
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid order status." });
    }

    await session.withTransaction(async () => {
      // Reset state if the driver retries this transaction after a write conflict.
      changed = false;
      previousStatus = undefined;
      const order = await Orders.findById(id).session(session);
      if (!order) fail(404, "Order not found");

      previousStatus = order.status;
      if (!canTransitionOrderStatus(previousStatus, status)) {
        fail(409, `Order cannot move from ${previousStatus} to ${status}.`);
      }
      if (previousStatus === status) return;

      // Do not cancel a captured order until the admin refund workflow records
      // Paystack's authoritative processed status (paymentStatus REVERSED).
      if (status === "CANCELLED" && order.paymentStatus === "PAID") {
        fail(409, "A paid order must be refunded before it can be cancelled.");
      }

      const updatedOrder = await Orders.findOneAndUpdate(
        {
          _id: id,
          status: previousStatus,
          ...(status === "CANCELLED" ? { inventoryReleasedAt: null } : {}),
        },
        { $set: {
          status,
          ...(status === "CANCELLED" ? { inventoryReleasedAt: new Date() } : {}),
        } },
        { new: true, runValidators: true, session },
      );
      if (!updatedOrder) fail(409, "The order changed while this update was being applied. Refresh and try again.");

      if (status === "CANCELLED") {
        const quantitiesByProduct = new Map();
        for (const item of order.items || []) {
          const productId = String(item.productId);
          quantitiesByProduct.set(productId, (quantitiesByProduct.get(productId) || 0) + item.quantity);
        }

        for (const [productId, quantity] of quantitiesByProduct) {
          const result = await Product.updateOne(
            { _id: productId, stock: { $lte: 1_000_000 - quantity } },
            { $inc: { stock: quantity } },
            { session, runValidators: true },
          );
          if (result.matchedCount !== 1) {
            fail(409, "A product in this order is missing or its stock limit would be exceeded, so cancellation cannot safely restore inventory.");
          }
        }
      }

      changed = true;
    });

    const order = await Orders.findById(id)
      .populate("user", "userName email")
      .populate("items.productId", "name images");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (changed) {
      await invalidateCacheNamespaces(
        CACHE_NAMESPACES.adminOrders,
        CACHE_NAMESPACES.userOrders,
        ...(status === "CANCELLED" ? [CACHE_NAMESPACES.products] : []),
      );
    }

    let emailSent = null;
    if (changed) {
      try {
        if (!order.user?.email) throw new Error("The order customer does not have an email address.");
        const email = buildOrderStatusEmail({ order, previousStatus, newStatus: status });
        const result = await sendEmail({ to: order.user.email, ...email });
        emailSent = Boolean(result?.success);
        if (!emailSent) console.error("Order status notification was not delivered:", result?.error || "Unknown mailer error");
      } catch (emailError) {
        console.error("Failed to send order status email:", emailError);
        emailSent = false;
      }
    }

    return res.status(200).json({
      success: true,
      message: emailSent === false
        ? "Order status updated, but the customer notification email could not be sent."
        : "Order status updated",
      emailSent,
      order,
    });
  } catch (error) {
    return next(error);
  } finally {
    await session.endSession();
  }
};
