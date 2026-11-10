import { Register } from "../../modules/userRegister.js";
export const removeCartItemController = async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Use $pull to extract the matching sub-document from the array container structure cleanly
    const updatedUser = await Register.findByIdAndUpdate(
      req.user.id,
      { $pull: { cart: { productId: productId } } },
      // FIXED: Swapped { new: true } for the modern returnDocument parameter signature mapping
      { returnDocument: 'after' }
    ).populate("cart.productId", "name price images stock");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User account profile record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product removed cleanly from shopping cart array",
      cart: updatedUser.cart,
    });
  } catch (err) {
    next(err);
  }
};