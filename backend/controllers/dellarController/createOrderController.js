import { Register } from "../../modules/userRegister.js";
import { Product } from "../../modules/productSchema.js";
import { Orders } from "../../modules/orderSchema.js";
export const createOrderController = async (
  req,
  res,
  next
) => {
  try {
    const user = await Register.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    let items = [];
    let totalPrice = 0;

    for (const cartItem of user.cart) {
      const product = await Product.findById(
        cartItem.productId
      );

      if (!product) {
        continue;
      }

      if (product.stock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is out of stock`,
        });
      }

      items.push({
        productId: product._id,
        name: product.name,
        image: product.images[0] || "",
        price: product.price,
        quantity: cartItem.quantity,
      });

      totalPrice +=
        product.price * cartItem.quantity;

      product.stock -= cartItem.quantity;

      await product.save();
    }

    const order = await Orders.create({
      user: user._id,
      items,
      totalPrice,
    });

    user.cart = [];
    await user.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (err) {
    next(err);
  }
};