import { Register } from "../../modules/userRegister.js";

export const getCartController = async (
  req,
  res,
  next
) => {
  try {
    const user = await Register.findById(
      req.user.id
    ).populate(
      "cart.productId",
      "name price images stock"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      cart: user.cart,
    });
  } catch (err) {
    next(err);
  }
};



