import { verifyToken } from "../middleware/verifyToken.js";
import { refreshToken } from "../middleware/refreshToken.js";
// Payment Controllers
import { verifyPaymentController } from "../controllers/Payment-controllers/verifyPaymentController.js";
import { initializePaymentController } from "../controllers/Payment-controllers/initializePaymentController.js";
import express from "express"
export const paymentRouter = express.Router()

// 7. Payment Routes (login required)
paymentRouter.post("/payment/initialize",verifyToken,refreshToken,initializePaymentController);
paymentRouter.get("/verify-payment/:reference",verifyToken,refreshToken,verifyPaymentController);
