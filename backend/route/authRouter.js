// Auth Controllers
import { verifyToken } from "../middleware/verifyToken.js";
import { apiLimiter, authAttemptLimiter, otpAttemptLimiter, registrationLimiter, passwordResetRequestLimiter, passwordResetVerifyLimiter } from "../middleware/loginLimitation.js";
import { refreshToken } from "../middleware/refreshToken.js";
import { userRegisterController } from "../controllers/authController/userRegisterController.js";
import { userLoginController } from "../controllers/authController/userloginController.js";
import { userLogoutController } from "../controllers/authController/userlogOutController.js";
import { resetPasswordController, completeForgotPasswordResetController } from "../controllers/authController/resetPasswordController.js";
import { forgotPasswordController } from "../controllers/authController/forgotPasswordController.js";
import { resendResetOtpController } from "../controllers/authController/resendResetOtpController.js";
import { verifyResetOtpController } from "../controllers/authController/verifyResetOtpController.js";
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
authRouter.post("/forgot-password", passwordResetRequestLimiter, validateRequest({ body: { "email*": v.email }, query: {} }), forgotPasswordController);
const validResetFlowId = (value) => typeof value === 'string' && value.length <= 512 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(value);
authRouter.post("/resend-reset-otp", passwordResetRequestLimiter, validateRequest({ body: { "email*": v.email, "flowId*": validResetFlowId }, query: {} }), resendResetOtpController);
authRouter.post("/verify-reset-otp", passwordResetVerifyLimiter, validateRequest({ body: { "email*": v.email, "flowId*": validResetFlowId, "otp*": (value) => typeof value === 'string' && /^\d{6}$/.test(value) }, query: {} }), verifyResetOtpController);
authRouter.post("/reset-password", apiLimiter, validateRequest({ body: { "email*": v.email, "resetAuthorization*": (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{40,100}$/.test(value), "newPassword*": v.password }, query: {} }), completeForgotPasswordResetController);
authRouter.post("/user-log-out", verifyToken, refreshToken, validateRequest({ body: {}, query: {} }), userLogoutController);
const validatePasswordChange = validateRequest({ body: { "currentPassword*": (value) => typeof value === "string" && value.length <= 128, "newPassword*": v.password }, query: {} });
authRouter.put( "/user-reset-password",apiLimiter,verifyToken,refreshToken,validatePasswordChange,resetPasswordController,);
authRouter.put( "/reset-password",apiLimiter,verifyToken,refreshToken,validatePasswordChange,resetPasswordController,);
