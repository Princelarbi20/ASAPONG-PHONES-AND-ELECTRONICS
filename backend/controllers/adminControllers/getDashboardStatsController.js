import { Register } from "../../modules/userRegister.js";
import { Product } from "../../modules/productSchema.js";
// import { Order } from "../../modules/orderSchema.js"; // Uncomment when you have an Order schema!

export const getDashboardStatsController = async (req, res, next) => {
  try {
    // Promise.all runs these database queries in parallel for fast performance
    const [totalUsers, suspendedCount, totalProducts] = await Promise.all([
      Register.countDocuments({}),                 // Counts all users
      Register.countDocuments({ isSuspended: true }), // Counts only suspended users
      Product.countDocuments({})                   // Counts all products
    ]);

    // Hardcoded fallbacks for metrics you haven't built database schemas for yet
    const activeOrders = 12; 
    const totalRevenue = 1450.75;

    return res.status(200).json({
      success: true,
      stats: {
        totalProducts,
        totalUsers,
        suspendedUsers: suspendedCount,
        activeOrders,  // Will update dynamically once you hook up your Order model
        totalRevenue   // Will update dynamically once you hook up your Order model
      }
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching dashboard statistics."
    });
  }
};