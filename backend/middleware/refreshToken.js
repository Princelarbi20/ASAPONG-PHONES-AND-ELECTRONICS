import jwt from "jsonwebtoken";
import { setAuthCookies, clearAuthCookies } from "../utils/authCookies.js";

export const refreshToken = async (req, res, next) => {
    // verifyToken already rotated cookie credentials for this request.
    if (req.authRefreshed) return next();
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET

    const authHeader = req.headers.authorization;
    const headerToken = authHeader && authHeader.split(' ')[1];
    const accessToken = headerToken || req.cookies?.accessToken;

    const refreshToken = req.cookies?.refreshToken;
    const issueNewTokens = (payload) => {
        const newAccessToken = jwt.sign(
            { id: payload.id, email: payload.email, role: payload.role },
            accessTokenSecret,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRE }
        );

        const newRefreshToken = jwt.sign(
            { id: payload.id, email: payload.email, role: payload.role },
            refreshTokenSecret,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRE }
        );

        setAuthCookies(res, newAccessToken, newRefreshToken);
        req.user = { id: payload.id, email: payload.email, role: payload.role };
        return next();
    };

    if (!accessToken) {
        if (!refreshToken) {
            return res.status(401).json({ message: 'Please log in again.' });
        }

        try {
            const refreshDecoded = jwt.verify(refreshToken, refreshTokenSecret);
            return issueNewTokens(refreshDecoded);
        } catch (refreshError) {
            clearAuthCookies(res);
            return res.status(403).json({
                message: 'Please log in again.'
            });
        }
    }

    try {
        const decoded = jwt.verify(accessToken, accessTokenSecret);
        req.user = decoded;
        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            if (!refreshToken) {
                clearAuthCookies(res);
                return res.status(401).json({
                    message: 'Session access token expired, and refresh token cookie is missing.'
                });
            }

            try {
                const refreshDecoded = jwt.verify(refreshToken, refreshTokenSecret);
                return issueNewTokens(refreshDecoded);
            } catch (refreshError) {
                clearAuthCookies(res);
                return res.status(403).json({
                    message: 'Session validation expired or invalid Please authenticate again.'
                });
            }
        }

        return res.status(403).json({ message: 'Authentication handshake failed. Invalid token.' });
    }
};
;
