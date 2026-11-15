import { Register } from "../../modules/userRegister.js";

export const getAllUsersController = async (req,res,next) => {
  try {
    const users = await Register.find().select("-password");

    res.status(200).json({
      success: true,
      totalUsers: users.length,
      users,
    });
  } catch (err) {
    next(err);
  }
};