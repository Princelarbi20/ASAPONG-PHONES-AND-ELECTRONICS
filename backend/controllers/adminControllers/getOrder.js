import { Orders } from "../../modules/orderSchema.js";
import mongoose from "mongoose";

export const getOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Please provide Order ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Orders.findById(orderId)
      .populate("user", "userName email phone")
      .populate("items.productId", "name images");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const orderObj = order.toObject();

    return res.status(200).json({
      success: true,
      message: "Order found successfully",
      order: orderObj,
      payment: {
        status: orderObj.paymentStatus,
        provider: orderObj.paymentDetails?.provider || null,
        reference: orderObj.paymentDetails?.reference || null,
        channel: orderObj.paymentDetails?.channel || null,
        amount: orderObj.paymentDetails?.amount ?? null,
        currency: orderObj.paymentDetails?.currency || null,
        paidAt: orderObj.paymentDetails?.paidAt || null,
        paystackStatus: orderObj.paymentDetails?.paystackStatus || null,
      },
    });
  } catch (error) {
    console.error("Get Order Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};