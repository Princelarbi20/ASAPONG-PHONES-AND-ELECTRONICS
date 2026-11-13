import bcrypt from "bcrypt";
import { Register } from "../../modules/userRegister.js";
import { issueAuthTokens } from "../../utils/issueAuthTokens.js";

export const verifyOtpController = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // 1. Validate input
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required."
            });
        }

        // 2. Find user by email

        const user = await Register.findOne({ email: email.toLowerCase().trim() }).select('+otp');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // 3. Check if user is already verified
        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "User account is already verified."
            });
        }

        // 4. Check if OTP has expired
        const verifiedAt = new Date();
        if (!user.otpExpires || verifiedAt > user.otpExpires) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one."
            });
        }

        // 5. Compare OTP with hashed OTP
        const isOtpValid = await bcrypt.compare(otp, user.otp);

        if (!isOtpValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid OTP. Please try again."
            });
        }

        // 6. Mark user as verified and clear OTP fields
        // Consume the OTP conditionally so simultaneous submissions cannot
        // both verify the account and receive an authenticated session.
        const verification = await Register.updateOne(
            {
                _id: user._id,
                isVerified: false,
                otp: user.otp,
                otpExpires: { $gt: verifiedAt },
            },
            {
                $set: { isVerified: true, otp: null, otpExpires: null },
            }
        );

        if (verification.modifiedCount !== 1) {
            return res.status(409).json({
                success: false,
                message: "This OTP has expired or has already been used. Please request a new one.",
            });
        }

        issueAuthTokens(res, user, "USER");

        // 7. Success response
        return res.status(200).json({
            success: true,
            message: "Email verified successfully. Your account is now active!",
            accountType: "USER",
            user: {
                id: user._id,
                userName: user.userName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isVerified: true,
                isSuspended: user.isSuspended,
                cart: user.cart,
            }
        });

    } catch (error) {
        console.error("OTP Verification Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during OTP verification."
        });
    }
};
