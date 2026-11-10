import { Register } from "../../modules/userRegister.js";
import { ShopRequest } from "../../modules/shopRequestSchema.js";

export const getAuthSessionController = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const customer = await Register.findById(userId).select("-password -otp");
    if (customer) {
      return res.status(200).json({
        success: true,
        accountType: customer.role,
        user: {
          id: customer._id,
          userName: customer.userName,
          email: customer.email,
          phone: customer.phone,
          role: customer.role,
          isVerified: customer.isVerified,
          isSuspended: customer.isSuspended,
          cart: customer.cart,
        },
      });
    }

    const dealer = await ShopRequest.findById(userId).select("-password");
    if (dealer) {
      return res.status(200).json({
        success: true,
        accountType: "DEALER",
        user: {
          id: dealer._id,
          shopName: dealer.shopName,
          email: dealer.email,
          number: dealer.number,
          role: dealer.role,
          status: dealer.status,
          description: dealer.description,
          category: dealer.category,
          shopCertificates: dealer.shopCertificates,
        },
      });
    }

    return res.status(404).json({ success: false, message: "Account not found." });
  } catch (error) {
    return next(error);
  }
};
