import { Register } from "../../modules/userRegister.js";
export const unsuspendUserController = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const user = await Register.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isSuspended = false;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User unsuspended successfully",
      user,
    });
  } catch (err) {
    next(err);
  }
};