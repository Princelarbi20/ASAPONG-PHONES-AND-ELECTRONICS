// Backward-compatible middleware for routes that still include this after
// verifyToken. Token verification and rotation are handled there exactly once.
export const refreshToken = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    return next();
};
