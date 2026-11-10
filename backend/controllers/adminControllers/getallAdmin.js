import { Register } from "../../modules/userRegister.js";

export const getallAdmin = async (req, res) => {
    try {
        // 1. Query the database to find ONLY users whose role is explicitly "ADMIN"
        const admins = await Register.find({ role: "ADMIN" }).select("-password"); // .select("-password") hides the password hashes for security

        // 2. If the array length is 0, it means no admins exist in the collection
        if (!admins || admins.length === 0) {
            return res.status(404).json({
                success: false, // Changed to false because this is an error/empty state
                message: "There are no admins registered in the system."
            });
        }

        // 3. Return the array of found admins
        return res.status(200).json({
            success: true,
            message: "Total admins retrieved successfully.",
            count: admins.length,
            data: admins
        });
       
    } catch (error) {
        console.error("Get All Admin Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching admins.",
            error: error.message
        });
    }
};