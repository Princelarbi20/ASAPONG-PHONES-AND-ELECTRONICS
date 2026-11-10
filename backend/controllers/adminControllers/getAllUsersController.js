import { Register } from "../../modules/userRegister.js";
import { getPagination, paginationResult } from "../../utils/pagination.js";

export const getAllUsersController = async (req,res,next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const [users, totalUsers] = await Promise.all([
      Register.find().select("-password").sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
      Register.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      totalUsers,
      users,
      pagination: paginationResult(page, limit, totalUsers),
    });
  } catch (err) {
    next(err);
  }
};
