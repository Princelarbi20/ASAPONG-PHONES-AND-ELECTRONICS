import bcrypt from "bcrypt";
import { Register } from "../../modules/userRegister.js";
import { ShopRequest } from "../../modules/shopRequestSchema.js";
import { issueAuthTokens } from "../../utils/issueAuthTokens.js";

const verifyPassword = async (password, passwordHash) => {
    if (typeof passwordHash !== "string" || !passwordHash.startsWith("$2")) return false;

    try {
        return await bcrypt.compare(password, passwordHash);
    } catch {
        // A malformed or legacy hash should be treated as a failed login, not a server error.
        return false;
    }
};

const isTemporarilyLocked = (account) =>
    (account.failedLoginAttempts || 0) >= 3 && account.lockUntil && account.lockUntil > Date.now();

const recordFailedLogin = async (model, accountId) => {
    const now = new Date();
    const result = await model.updateOne(
        {
            _id: accountId,
            $or: [
                { failedLoginAttempts: { $lt: 3 } },
                { lockUntil: { $lte: now } },
                { lockUntil: null },
            ],
        },
        {
            $inc: { failedLoginAttempts: 1 },
            $set: { lockUntil: new Date(now.getTime() + 50 * 60 * 1000) },
        }
    );
    return result.modifiedCount === 1;
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
            if (isTemporarilyLocked(regularUser)) {
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
                const updatedUser = await recordFailedLogin(Register, regularUser._id);

                if (!updatedUser) {
                    return res.status(403).json({
                        success: false,
                        message: "Account is temporarily locked. Try again later."
                    });
                }

                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password."
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
            issueAuthTokens(res, regularUser, "USER");

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
            if (isTemporarilyLocked(shopUser)) {
                return res.status(403).json({
                    success: false,
                    message: "Account is temporarily locked. Try again later."
                });
            }

            const isMatch = await verifyPassword(password, shopUser.password);

            if (!isMatch) {
                const updatedShop = await recordFailedLogin(ShopRequest, shopUser._id);
                if (!updatedShop) {
                    return res.status(403).json({
                        success: false,
                        message: "Account is temporarily locked. Try again later."
                    });
                }
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password."
                });
            }

            if (shopUser.failedLoginAttempts > 0 || shopUser.lockUntil) {
                await ShopRequest.updateOne(
                    { _id: shopUser._id },
                    { $set: { failedLoginAttempts: 0, lockUntil: null } }
                );
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

            issueAuthTokens(res, shopUser, "DEALER");

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
            message: "Invalid email or password."
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};
