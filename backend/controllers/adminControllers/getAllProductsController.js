import { Product } from "../../modules/productSchema.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });

    // Respond with a structured object that matches your frontend expectations
    res.status(200).json({
      success: true,
      count: products.length,
      products: products
    });
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fetch inventory data.',
      error: error.message
    });
  }
};
