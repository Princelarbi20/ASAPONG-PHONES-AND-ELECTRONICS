import { Register } from "../../modules/userRegister.js";
import { Product } from "../../modules/productSchema.js"; // 🚀 Added Product schema import for stock validation

export const updateCartQuantityController = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    // 1. Guard clause: Check for missing payload parameters explicitly
    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        message: "Quantity parameter is required",
      });
    }

    const targetQuantity = Number(quantity);

    // 2. Optimization: If quantity hits 0 or less, cleanly remove the item entirely
    if (targetQuantity <= 0) {
      const updatedUser = await Register.findByIdAndUpdate(
        req.user.id,
        { $pull: { cart: { productId: productId } } },
        { returnDocument: 'after' }
      ).populate("cart.productId", "name price images stock");

      return res.status(200).json({
        success: true,
        message: "Product removed automatically since quantity reached zero",
        cart: updatedUser?.cart || [],
      });
    }

    // 3. Stock Level Guard: Fetch product stock directly from the database registry
    const product = await Product.findById(productId).select("stock name");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product record not found in active catalog",
      });
    }

    // Check if user's requested quantity exceeds available physical stock bounds
    if (targetQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} ${product.name} are available in stock.`,
      });
    }

    // 4. Safe Mutation: Update the quantity field within the array sub-document element cleanly
    const updatedUser = await Register.findOneAndUpdate(
      { _id: req.user.id, "cart.productId": productId },
      { $set: { "cart.$.quantity": targetQuantity } },
      { returnDocument: 'after' }
    ).populate("cart.productId", "name price images stock");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Cart item target not found in user database record",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cart quantity synchronized successfully",
      cart: updatedUser.cart,
    });
  } catch (err) {
    next(err);
  }
};