import jwt from 'jsonwebtoken';
import { Register } from '../modules/userRegister.js';
import { ShopRequest } from '../modules/shopRequestSchema.js';
import { clearAuthCookies, setAuthCookies } from '../utils/authCookies.js';

const validRoles = new Set(['USER', 'ADMIN', 'DEALER']);
const validAccountTypes = new Set(['USER', 'DEALER']);

const validatePayload = (payload) => {
    if (!payload || typeof payload !== 'object' || typeof payload.id !== 'string' || !/^[a-f\d]{24}$/i.test(payload.id)) return false;
    if (!validRoles.has(payload.role)) return false;
    if (payload.accountType !== undefined && !validAccountTypes.has(payload.accountType)) return false;
    return payload.ver === undefined || (Number.isSafeInteger(payload.ver) && payload.ver >= 0);
};

const findAccount = async (payload) => {
    if (payload.accountType === 'USER') {
        const user = await Register.findById(payload.id);
        return user ? { account: user, accountType: 'USER' } : null;
    }
    if (payload.accountType === 'DEALER') {
        const dealer = await ShopRequest.findById(payload.id);
        return dealer ? { account: dealer, accountType: 'DEALER' } : null;
    }

    // Accept existing tokens that were issued before accountType was added.
    const user = await Register.findById(payload.id);
    if (user) return { account: user, accountType: 'USER' };
    const dealer = await ShopRequest.findById(payload.id);
    return dealer ? { account: dealer, accountType: 'DEALER' } : null;
};

const resolveIdentity = async (payload) => {
    if (!validatePayload(payload)) return { error: 'invalid' };

    const found = await findAccount(payload);
    if (!found) return { error: 'missing' };

    const { account, accountType } = found;
    if (account.role !== payload.role || (payload.ver ?? 0) !== (account.tokenVersion ?? 0)) {
        return { error: 'invalid' };
    }

    if (accountType === 'USER') {
        if (account.isSuspended) return { error: 'suspended' };
        if (!account.isVerified) return { error: 'unverified' };
    } else if (account.status !== 'APPROVED') {
        return { error: 'inactive-dealer' };
    }

    return {
        identity: {
            id: String(account._id),
            email: account.email,
            role: account.role,
            accountType,
            ver: account.tokenVersion ?? 0,
        },
    };
};

const rejectIdentity = (res, error) => {
    if (error === 'suspended' || error === 'inactive-dealer') {
        clearAuthCookies(res);
        return res.status(403).json({ success: false, message: 'This account cannot access the application.' });
    }
    if (error === 'unverified') {
        clearAuthCookies(res);
        return res.status(403).json({ success: false, message: 'Please verify your email address before continuing.' });
    }
    clearAuthCookies(res);
    return res.status(401).json({
        success: false,
        message: error === 'missing' ? 'Account not found. Please log in again.' : 'Access denied. Invalid token.',
    });
};

const refreshSession = async (req, res, next, refreshToken) => {
    try {
        const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, { algorithms: ['HS256'] });
        const resolved = await resolveIdentity(payload);
        if (resolved.error) return rejectIdentity(res, resolved.error);

        const identity = resolved.identity;
        const newAccessToken = jwt.sign(identity, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRE,
            algorithm: 'HS256',
        });
        const newRefreshToken = jwt.sign(identity, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRE,
            algorithm: 'HS256',
        });

        setAuthCookies(res, newAccessToken, newRefreshToken);
        req.user = identity;
        req.authRefreshed = true;
        return next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            clearAuthCookies(res);
            return res.status(401).json({ success: false, message: 'Your refresh session is invalid or expired. Please log in again.' });
        }
        return next(error);
    }
};

export const verifyToken = async (req, res, next) => {
    const authorization = req.headers.authorization;
    const bearerMatch = typeof authorization === 'string' && authorization.match(/^Bearer\s+(.+)$/i);
    const accessToken = bearerMatch?.[1] || req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    if (!accessToken) {
        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'Access denied. Please log in again.' });
        }
        return refreshSession(req, res, next, refreshToken);
    }

    try {
        const payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, { algorithms: ['HS256'] });
        const resolved = await resolveIdentity(payload);
        if (resolved.error) return rejectIdentity(res, resolved.error);
        req.user = resolved.identity;
        return next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            if (!refreshToken) {
                clearAuthCookies(res);
                return res.status(401).json({ success: false, message: 'Your session has expired. Please log in again.' });
            }
            return refreshSession(req, res, next, refreshToken);
        }
        if (error instanceof jwt.JsonWebTokenError) {
            clearAuthCookies(res);
            return res.status(401).json({ success: false, message: 'Access denied. Invalid token.' });
        }
        return next(error);
    }
};
