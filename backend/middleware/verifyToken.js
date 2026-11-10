import jwt from 'jsonwebtoken';
import { clearAuthCookies, setAuthCookies } from '../utils/authCookies.js';

// Every protected route uses this middleware first. It accepts a valid access
// token, or transparently renews it from a valid HttpOnly refresh-token cookie.
export const verifyToken = (req, res, next) => {
    const accessToken = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    const refreshToken = req.cookies?.refreshToken;

    if (!accessToken) {
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Please log in again.'
            });
        }

        return refreshSession(req, res, next, refreshToken);
    }

    try {
        req.user = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        return next();
    } catch (error) {
        if (error.name !== 'TokenExpiredError') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Invalid token.'
            });
        }

        if (!refreshToken) {
            clearAuthCookies(res);
            return res.status(401).json({
                success: false,
                message: 'Your session has expired. Please log in again.'
            });
        }

        return refreshSession(req, res, next, refreshToken);
    }
};

const refreshSession = (req, res, next, refreshToken) => {
    try {
        const refreshPayload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const payload = {
            id: refreshPayload.id,
            email: refreshPayload.email,
            role: refreshPayload.role
        };
        const newAccessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRE
        });
        const newRefreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRE
        });

        setAuthCookies(res, newAccessToken, newRefreshToken);
        req.user = payload;
        // The following refreshToken middleware on existing routes can skip its
        // duplicate verification after this successful rotation.
        req.authRefreshed = true;
        return next();
    } catch (error) {
        clearAuthCookies(res);
        return res.status(403).json({
            success: false,
            message: 'Your refresh session is invalid or expired. Please log in again.'
        });
    }
};
