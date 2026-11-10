import mongoose from "mongoose";
import { Orders } from "../../modules/orderSchema.js";

const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "ABANDONED", "REVERSED"];

export const getUserOrdersController = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const rawUserId = req.user.id || req.user._id;

    if (!rawUserId || !mongoose.Types.ObjectId.isValid(String(rawUserId))) {
      return res.status(400).json({
        success: false,
        message: "Invalid user identifier.",
      });
    }

    const filter = { user: new mongoose.Types.ObjectId(String(rawUserId)) };

    // Optional filter: /my-orders?paymentStatus=PAID
    const requestedStatus = String(req.query.paymentStatus || "").toUpperCase();
    if (requestedStatus) {
      if (!PAYMENT_STATUSES.includes(requestedStatus)) {
        return res.status(400).json({
          success: false,
          message: `paymentStatus must be one of: ${PAYMENT_STATUSES.join(", ")}`,
        });
      }
      filter.paymentStatus = requestedStatus;
    }

    const userOrders = await Orders.find(filter)
      .populate({
        path: "items.productId",
        select: "name price images description brand category stock specifications",
      })
      .sort({ createdAt: -1 });

    const orders = userOrders.map((order) => {
      const obj = order.toObject();

      // Don't expose internal gateway details to customers
      if (obj.paymentDetails) {
        delete obj.paymentDetails.transactionId;
        delete obj.paymentDetails.gatewayResponse;
      }

      // Frontend can show a "Pay now" button when this is true
      obj.canPay =
        ["PENDING", "FAILED", "ABANDONED"].includes(obj.paymentStatus) &&
        obj.status !== "CANCELLED";

      return obj;
    });

    return res.status(200).json({
      success: true,
      count: orders.length,
      message: "Orders retrieved successfully.",
      orders,
    });
  } catch (err) {
    return next(err);
  }
};