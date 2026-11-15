import { Register } from "../../modules/userRegister.js";

export const updateUserController = async (req, res) => {
    try {
        // 1. In a real app, the user ID should come from your JWT auth middleware (e.g., req.user.id)
        // For flexibility here, we'll look for it in req.params.id first, then req.body.id
        const userId = req.params.id || req.body.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required to update details."
            });
        }

        // 2. Extract ONLY the fields that a user is allowed to safely change themselves
        const { userName, phone, email } = req.body;

        // Create an update object with only provided fields
        const updates = {};
        if (userName) updates.userName = userName;
        if (phone) updates.phone = phone;
        if (email) updates.email = email.toLowerCase().trim(); // Ensure formatting holds up

        // If no valid update fields were provided, stop early
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update."
            });
        }

        // 3. Update the document in MongoDB
        // { new: true } returns the updated document instead of the old one
        // { runValidators: true } ensures the updates obey your Schema rules (like unique email)
        const updatedUser = await Register.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-password"); // Shield the password hash from being sent back

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // 4. Send back the updated profile details
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });

    } catch (error) {
        // Handle MongoDB duplicate key error (e.g., if they try to update to an email that's already taken)
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "That email address is already in use by another account."
            });
        }

        console.error("Update User Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};