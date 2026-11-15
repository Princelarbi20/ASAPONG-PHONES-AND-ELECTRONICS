import { Register } from "../../modules/userRegister.js";
import { Product } from "../../modules/productSchema.js";

export const addToCartController = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    
    // Parse input safely or default back to 1 unit if missing
    const itemsCountToAdd = quantity ? Number(quantity) : 1;

    if (itemsCountToAdd < 1) {
      return res.status(400).json({
        success: false,
        message: "Must be at least 1 item.",
      });
    }

    // 1. Verify user profile exists
    const user = await Register.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2. Verify product exists and fetch current live floor stock levels
    const product = await Product.findById(productId).select("_id stock name");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 3. Find if the item already exists in the cart array matrix
    const existingItem = user.cart.find(
      (item) => item.productId.toString() === productId
    );

    const currentQtyInCart = existingItem ? existingItem.quantity : 0;

    // 🚀 CRITICAL FIX: Verify CUMULATIVE quantity against live inventory limits
    if (product.stock < (currentQtyInCart + itemsCountToAdd)) {
      return res.status(400).json({
        success: false,
        message:"Sorry, you can't add more than the available stock.",
      });
    }

    if (existingItem) {
      // Safely increment cumulative total numbers
      existingItem.quantity += itemsCountToAdd;
    } else {
      // Create new sub-document entry cleanly
      user.cart.push({
        productId,
        quantity: itemsCountToAdd,
      });
    }

    await user.save();

    // Populate updated cart info to mirror state configurations precisely to the Redux store
    const populatedUser = await Register.findById(req.user.id).populate(
      "cart.productId",
      "name price images stock category brand"
    );

    res.status(200).json({
      success: true,
      message: "Product updated in cart successfully",
      cart: populatedUser.cart,
    });
  } catch (err) {
    next(err);
  }
};