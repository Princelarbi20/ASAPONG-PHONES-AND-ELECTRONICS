import { verifyToken } from "../middleware/verifyToken.js";
import { refreshToken } from "../middleware/refreshToken.js";
// Payment Controllers
import { verifyPaymentController } from "../controllers/Payment-controllers/verifyPaymentController.js";
import { initializePaymentController } from "../controllers/Payment-controllers/initializePaymentController.js";
import express from "express"
import { validateRequest, validators as v } from "../middleware/requestValidation.js";
export const paymentRouter = express.Router()

// 7. Payment Routes (login required)
paymentRouter.post("/payment/initialize",verifyToken,refreshToken,validateRequest({ body: { "orderId*": v.objectId }, query: {} }),initializePaymentController);
paymentRouter.get("/verify-payment/:reference",verifyToken,refreshToken,validateRequest({ params: { "reference*": (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{8,120}$/.test(value) }, query: {}, body: {} }),verifyPaymentController);
