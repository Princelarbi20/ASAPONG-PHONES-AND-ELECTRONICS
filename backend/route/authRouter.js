// Auth Controllers
import { verifyToken } from "../middleware/verifyToken.js";
import { apiLimiter, authAttemptLimiter, otpAttemptLimiter, registrationLimiter } from "../middleware/loginLimitation.js";
import { refreshToken } from "../middleware/refreshToken.js";
import { userRegisterController } from "../controllers/authController/userRegisterController.js";
import { userLoginController } from "../controllers/authController/userloginController.js";
import { userLogoutController } from "../controllers/authController/userlogOutController.js";
import { resetPasswordController } from "../controllers/authController/resetPasswordController.js";
import { verifyOtpController } from "../controllers/authController/verifyOtpController.js";
import { resendOtpController } from "../controllers/authController/resendOtpController.js";
import { getAuthSessionController } from "../controllers/authController/getAuthSessionController.js";
import express from "express"
import { validateRequest, validators as v } from "../middleware/requestValidation.js";
export const authRouter= express.Router()


// 1. Authentication Routes

authRouter.get("/auth/session", verifyToken, refreshToken, validateRequest({ query: {}, body: {} }), getAuthSessionController);
authRouter.post("/user-register", registrationLimiter, validateRequest({ body: { "userName*": v.name, "email*": v.email, "phone*": v.phone, "password*": v.password }, query: {} }), userRegisterController);
authRouter.post("/verify-otp", otpAttemptLimiter, validateRequest({ body: { "email*": v.email, "otp*": (value) => typeof value === "string" && /^\d{6}$/.test(value) }, query: {} }), verifyOtpController);
authRouter.post("/resend-otp", otpAttemptLimiter, validateRequest({ body: { "email*": v.email }, query: {} }), resendOtpController);
authRouter.post("/user-login", authAttemptLimiter, validateRequest({ body: { "email*": v.email, "password*": (value) => typeof value === "string" && value.length <= 128 }, query: {} }), userLoginController);
authRouter.post("/user-log-out", verifyToken, refreshToken, validateRequest({ body: {}, query: {} }), userLogoutController);
const validatePasswordChange = validateRequest({ body: { "currentPassword*": (value) => typeof value === "string" && value.length <= 128, "newPassword*": v.password }, query: {} });
authRouter.put( "/user-reset-password",apiLimiter,verifyToken,refreshToken,validatePasswordChange,resetPasswordController,);
authRouter.put( "/reset-password",apiLimiter,verifyToken,refreshToken,validatePasswordChange,resetPasswordController,);
