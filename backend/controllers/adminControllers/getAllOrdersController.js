import { Orders } from "../../modules/orderSchema.js";

export const getAllOrdersController = async (req,res,next) => {
  try {
    const orders = await Orders.find()
      .populate("user", "userName email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      totalOrders: orders.length,
      orders,
    });
  } catch (err) {
    next(err);
  }
};