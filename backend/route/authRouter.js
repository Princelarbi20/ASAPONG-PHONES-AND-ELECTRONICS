// Auth Controllers
import { verifyToken } from "../middleware/verifyToken.js";
import { apiLimiter } from "../middleware/loginLimitation.js";
import { refreshToken } from "../middleware/refreshToken.js";
import { userRegisterController } from "../controllers/authController/userRegisterController.js";
import { userLoginController } from "../controllers/authController/userloginController.js";
import { userLogoutController } from "../controllers/authController/userlogOutController.js";
import { resetPasswordController } from "../controllers/authController/resetPasswordController.js";
import { verifyOtpController } from "../controllers/authController/verifyOtpController.js";
import { resendOtpController } from "../controllers/authController/resendOtpController.js";
import { getAuthSessionController } from "../controllers/authController/getAuthSessionController.js";
import express from "express"
export const authRouter= express.Router()


// 1. Authentication Routes

authRouter.get("/auth/session", verifyToken, refreshToken, getAuthSessionController);
authRouter.post("/user-register", userRegisterController);
authRouter.post("/verify-otp", verifyOtpController);
authRouter.post("/resend-otp", resendOtpController);
authRouter.post("/user-login", userLoginController);
authRouter.post("/user-log-out", verifyToken, refreshToken, userLogoutController);
authRouter.put( "/user-reset-password",apiLimiter,verifyToken,refreshToken,resetPasswordController,);
