import { ShopRequest } from "../../modules/shopRequestSchema.js";
import { Product } from "../../modules/productSchema.js";
export const addProductDealerController = async (req, res, next) => {
  try {
    const { name, description, price, category, stock, brand, rating } = req.body;

    const userShop = await ShopRequest.findById(req.user?.id); 
    if (!userShop) {
      return res.status(403).json({
        success: false,
        message: "Action forbidden. You must be associated with a registered shop to add products.",
      });
    }
      if (userShop.status!=="APPROVED") {
      return res.status(403).json({
        success: false,
        message: "Your account is on pending try again after some time",
      });
    }

    // 1. Bring this validation back! It helps catch empty fields BEFORE Mongoose crashes
    if (!name || !description || !price || !category || !stock || !brand) {
      return res.status(400).json({
        success: false,
        message: "All product details (name, description, price, category, stock, brand) are required.",
      });
    }

    const images = req.files?.map((file) => file.path) || [];

    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product already exists",
      });
    }

    // 2. Safe parsing implementation
    const product = await Product.create({
      name,
      description,
      price: Number(price), // Explicitly cast to Number
      category,             // Will definitely exist now because of the validation block above
      stock: Number(stock) || 0,
      brand,
      rating: Number(rating) || 1,
      images,
      shop: userShop.shopName, 
      status: "PENDING" 
    });

    return res.status(201).json({
      success: true,
      message: "Product submitted successfully. Awaiting admin approval.",
      product,
    });
  } catch (err) {
    next(err);
  }
};
