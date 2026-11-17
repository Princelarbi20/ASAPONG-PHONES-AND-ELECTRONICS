import mongoose from "mongoose";
import { Orders } from "../../modules/orderSchema.js";
import { getPagination, paginationResult } from "../../utils/pagination.js";

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

    const pageOptions = getPagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const [userOrders, total] = await Promise.all([
      Orders.find(filter)
        .select('_id orderNumber status paymentStatus paymentMethod paymentDetails.provider paymentDetails.channel paymentDetails.serviceProvider totalPrice createdAt expiresAt shippingAddress items')
        .populate({ path: "items.productId", select: "images" })
        .sort({ createdAt: -1, _id: -1 })
        .skip(pageOptions.skip)
        .limit(pageOptions.limit),
      Orders.countDocuments(filter),
    ]);

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
        !["CANCELLED", "EXPIRED"].includes(obj.status) &&
        !(obj.expiresAt && new Date(obj.expiresAt) <= new Date());

      return obj;
    });

    return res.status(200).json({
      success: true,
      count: total,
      message: "Orders retrieved successfully.",
      orders,
      pagination: paginationResult(pageOptions.page, pageOptions.limit, total),
    });
  } catch (err) {
    return next(err);
  }
};
