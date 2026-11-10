export const userLogoutController = async (req, res) => {
    try {
        // Options must match the domain, path, and security flags used when creating the cookies
        const cookieOptions = {
            httpOnly: true,
            secure: false, // Set to true if you are running in production with HTTPS
            sameSite: 'lax',
            path: '/'
        };

        // 🚀 Clear the authentication cookies by forcing immediate expiration
        res.cookie('token', '', { ...cookieOptions, maxAge: 0 });
        res.cookie('refreshToken', '', { ...cookieOptions, maxAge: 0 });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully. Authentication cookies cleared."
        });

    } catch (error) {
        console.error("Logout Controller Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error occurred during logout."
        });
    }
};