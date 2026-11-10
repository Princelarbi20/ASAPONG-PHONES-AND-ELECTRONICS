import { Orders } from "../../modules/orderSchema.js";
import { getPagination, paginationResult } from "../../utils/pagination.js";

export const getAllOrdersController = async (req,res,next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const [orders, totalOrders] = await Promise.all([
      Orders.find()
        .populate("user", "userName email phone")
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      Orders.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      totalOrders,
      orders,
      pagination: paginationResult(page, limit, totalOrders),
    });
  } catch (err) {
    next(err);
  }
};
