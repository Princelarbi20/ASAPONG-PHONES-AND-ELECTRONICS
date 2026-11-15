import { Register } from "../../modules/userRegister.js";
import bcrypt from "bcrypt";

export const resetPasswordController = async (req, res) => {
    try {

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword || !req.user?.id) {
            return res.status(400).json({
                 success: false, 
                 message: "Your current password and a new password are required." 
                });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
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

        // 4. Clear out the reset token fields so they can't reuse the link
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        
        await user.save();

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
