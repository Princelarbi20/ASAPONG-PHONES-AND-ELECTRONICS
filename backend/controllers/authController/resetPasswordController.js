import { Register } from "../../modules/userRegister.js";
import bcrypt from "bcrypt";
import { isValidPassword } from "../../middleware/requestValidation.js";
import { clearAuthCookies } from '../../utils/authCookies.js';
import { PasswordResetOTP } from '../../modules/passwordResetOTP.js';
import sendEmail from '../../utils/nodemailer.js';
import { escapeHtml } from '../../utils/escapeHtml.js';
import { getPasswordChangedEmail, hashResetSecret } from '../../utils/passwordReset.js';

export const resetPasswordController = async (req, res) => {
    try {

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword || !req.user?.id) {
            return res.status(400).json({
                 success: false, 
                 message: "Your current password and a new password are required." 
                });
        }

        if (!isValidPassword(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 8 characters and include uppercase, lowercase, number, and symbol."
            });
        }

        const user = await Register.findById(req.user.id).select('+password');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Account not found."
            });
        }

        const currentPasswordMatches = await bcrypt.compare(currentPassword, user.password);
        if (!currentPasswordMatches) {
            return res.status(401).json({ success: false, message: "Current password is incorrect." });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, message: "Choose a new password different from your current password." });
        }

        // 3. Hash the new password securely
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.tokenVersion = (user.tokenVersion || 0) + 1;

        // 4. Clear out the reset token fields so they can't reuse the link
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        
        await user.save();
        clearAuthCookies(res);

        return res.status(200).json({
            success: true,
            message: "Password reset successfully! You can now log in with your new password."
        });

    } catch (error) {
        console.error("Reset Password Error:", error);
        return res.status(500).json({
             success: false,
             message: "Internal server error." });
    }
};

export const completeForgotPasswordResetController = async (req, res) => {
    try {
        const { email, resetAuthorization, newPassword } = req.body;
        if (!isValidPassword(newPassword)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.' });
        }

        const user = await Register.findOne({ email: email.toLowerCase().trim(), isVerified: true, isSuspended: false }).select('+password');
        if (!user) return res.status(400).json({ success: false, message: 'The reset session is invalid or expired. Please start again.' });
        if (await bcrypt.compare(newPassword, user.password)) {
            return res.status(400).json({ success: false, message: 'Choose a new password different from your current password.' });
        }
        const record = await PasswordResetOTP.findOneAndUpdate(
            { userId: user._id, authorizationHash: hashResetSecret(resetAuthorization), authorizationExpiresAt: { $gt: new Date() } },
            { $set: { authorizationHash: null, authorizationExpiresAt: null, otpHash: null, otpExpiresAt: null, otpAttempts: 0 } },
            { new: true },
        );
        if (!record) return res.status(400).json({ success: false, message: 'The reset session is invalid or expired. Please start again.' });

        user.password = await bcrypt.hash(newPassword, 10);
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();
        await PasswordResetOTP.deleteOne({ userId: user._id });
        clearAuthCookies(res);

        const changedAt = new Date();
        const emailResult = await sendEmail({
            to: user.email,
            subject: 'Your Asa Phones password was changed',
            text: `Hello ${user.userName}, your Asa Phones password was changed on ${changedAt.toISOString()}. If you did not make this change, contact Asa Phones support immediately.`,
            html: getPasswordChangedEmail({ userName: escapeHtml(user.userName), changedAt: changedAt.toLocaleString() }),
        });
        if (!emailResult?.success) console.error('Password change notification email delivery failed.');
        return res.status(200).json({ success: true, message: 'Your password has been changed. Please sign in with your new password.' });
    } catch (error) {
        console.error('Forgot password reset failed:', error?.message || 'Unknown error');
        return res.status(500).json({ success: false, message: 'Could not reset your password. Please try again.' });
    }
};
