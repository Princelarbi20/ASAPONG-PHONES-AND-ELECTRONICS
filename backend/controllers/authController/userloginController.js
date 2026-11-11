import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Register } from "../../modules/userRegister.js";
import { ShopRequest } from "../../modules/shopRequestSchema.js";
import { setAuthCookies } from "../../utils/authCookies.js";

const verifyPassword = async (password, passwordHash) => {
    if (typeof passwordHash !== "string" || !passwordHash.startsWith("$2")) return false;

    try {
        return await bcrypt.compare(password, passwordHash);
    } catch {
        // A malformed or legacy hash should be treated as a failed login, not a server error.
        return false;
    }
};

export const userLoginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const searchEmail = email.toLowerCase().trim();

        // ==========================================
        // 1. REGULAR USER PATHWAY
        // ==========================================
        const regularUser = await Register.findOne({ email: searchEmail }).select('+password');

        if (regularUser) {
            // Check Lockout Status FIRST (Saves CPU time)
            if (regularUser.lockUntil && regularUser.lockUntil > Date.now()) {
                return res.status(403).json({
                    success: false,
                    message: "Account is temporarily locked. Try again later."
                });
            }

            // Check Suspension Status
            if (regularUser.isSuspended) {
                return res.status(403).json({
                    success: false,
                    message: "Your account has been suspended."
                });
            }

            // Verify Password
            const isMatch = await verifyPassword(password, regularUser.password);

            if (!isMatch) {
                const failedLoginAttempts = (regularUser.failedLoginAttempts || 0) + 1;
                const loginTracking = { failedLoginAttempts };

                if (failedLoginAttempts >= 3) {
                    loginTracking.lockUntil = new Date(Date.now() + 50 * 60 * 1000); // 50 minutes
                }

                await Register.updateOne({ _id: regularUser._id }, { $set: loginTracking });

                return res.status(401).json({
                    success: false,
                    message: "Invalid email or  password" // Generic to prevent account enumeration
                });
            }

            // 🚨 NEW CHECK: Prevent unverified users from logging in
            if (!regularUser.isVerified) {
                return res.status(403).json({
                    success: false,
                    message: "Please verify your email address via OTP before logging in.",
                    isVerified: false,
                    otpExpiresAt: regularUser.otpExpires?.toISOString()
                });
            }

            // Reset failed login tracking on successful login
            if (regularUser.failedLoginAttempts > 0 || regularUser.lockUntil) {
                await Register.updateOne(
                    { _id: regularUser._id },
                    { $set: { failedLoginAttempts: 0, lockUntil: null } }
                );
            }

            // Generate Tokens
            const token = jwt.sign(
                { id: regularUser._id, role: regularUser.role },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: process.env.ACCESS_TOKEN_EXPIRE }
            );

            const refreshToken = jwt.sign(
                { id: regularUser._id, role: regularUser.role },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: process.env.REFRESH_TOKEN_EXPIRE }
            );

            setAuthCookies(res, token, refreshToken);

            return res.status(200).json({
                success: true,
                message: "Login successful.",
                accountType: "USER",
                user: {
                    id: regularUser._id,
                    userName: regularUser.userName,
                    email: regularUser.email,
                    phone: regularUser.phone,
                    role: regularUser.role,
                    isVerified: regularUser.isVerified,
                    isSuspended: regularUser.isSuspended,
                    cart: regularUser.cart
                }
            });
        }

        // ==========================================
        // 2. DEALER SHOP USER PATHWAY
        // ==========================================
        const shopUser = await ShopRequest.findOne({ email: searchEmail }).select('+password');

        if (shopUser) {
            const isMatch = await verifyPassword(password, shopUser.password);

            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password."
                });
            }

            if (shopUser.status === "PENDING") {
                return res.status(403).json({
                    success: false,
                    message: "Your dealer account is still pending approval."
                });
            }

            if (shopUser.status === "REJECTED") {
                return res.status(403).json({
                    success: false,
                    message: "Your dealer request has been rejected."
                });
            }

            const token = jwt.sign(
                { id: shopUser._id, role: shopUser.role },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: process.env.ACCESS_TOKEN_EXPIRE }
            );

            const refreshToken = jwt.sign(
                { id: shopUser._id, role: shopUser.role },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: process.env.REFRESH_TOKEN_EXPIRE }
            );

            setAuthCookies(res, token, refreshToken);

            return res.status(200).json({
                success: true,
                message: "Login successful.",
                accountType: "DEALER",
                user: {
                    id: shopUser._id,
                    shopName: shopUser.shopName,
                    email: shopUser.email,
                    number: shopUser.number,
                    role: shopUser.role,
                    status: shopUser.status,
                    description: shopUser.description,
                    category: shopUser.category,
                    shopCertificates: shopUser.shopCertificates
                }
            });
        }

        // ==========================================
        // 3. NO ACCOUNT FOUND
        // ==========================================
        return res.status(401).json({
            success: false,
            message: "This email is not registered."
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};
