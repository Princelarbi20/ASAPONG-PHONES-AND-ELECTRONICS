import { Register } from "../../modules/userRegister.js";
import { ShopRequest } from "../../modules/shopRequestSchema.js";
import { AuthAuditLog } from '../../modules/authAuditLog.js';
import { issueAuthTokens } from "../../utils/issueAuthTokens.js";
import { hashPassword, isLegacyPasswordHash, verifyPassword } from '../../utils/passwordHash.js';

const isTemporarilyLocked = (account) =>
    Boolean(account.lockUntil && account.lockUntil > Date.now());

const MAX_FAILED_LOGIN_ATTEMPTS = 7;
const LOCKOUT_MINUTES = [15, 30, 60];

const recordFailedLogin = async (model, accountId) => {
    const now = new Date();
    const currentAttempts = { $ifNull: ['$failedLoginAttempts', 0] };
    const lockExpired = {
        $and: [
            { $ne: [{ $ifNull: ['$lockUntil', null] }, null] },
            { $lte: ['$lockUntil', now] },
        ],
    };
    const nextAttempts = {
        $add: [{ $cond: [lockExpired, 0, currentAttempts] }, 1],
    };
    const currentLockouts = { $ifNull: ['$consecutiveLockouts', 0] };
    const isLockingAccount = { $gte: [nextAttempts, MAX_FAILED_LOGIN_ATTEMPTS] };
    const nextLockouts = { $add: [currentLockouts, 1] };
    const nextLockDurationMinutes = {
        $switch: {
            branches: [
                { case: { $eq: [nextLockouts, 1] }, then: LOCKOUT_MINUTES[0] },
                { case: { $eq: [nextLockouts, 2] }, then: LOCKOUT_MINUTES[1] },
            ],
            default: LOCKOUT_MINUTES[2],
        },
    };
    const account = await model.findOneAndUpdate(
        {
            _id: accountId,
            $and: [
                { $or: [{ lockUntil: null }, { lockUntil: { $lte: now } }] },
                {
                    $or: [
                        { lockUntil: { $lte: now } },
                        { failedLoginAttempts: { $lt: MAX_FAILED_LOGIN_ATTEMPTS } },
                        { failedLoginAttempts: null },
                    ],
                },
            ],
        },
        [{ $set: {
            failedLoginAttempts: nextAttempts,
            consecutiveLockouts: {
                $cond: [isLockingAccount, nextLockouts, currentLockouts],
            },
            lockUntil: {
                $cond: [
                    isLockingAccount,
                    { $dateAdd: { startDate: '$$NOW', unit: 'minute', amount: nextLockDurationMinutes } },
                    { $cond: [lockExpired, null, '$lockUntil'] },
                ],
            },
        } }],
        { returnDocument: 'after', projection: { failedLoginAttempts: 1, consecutiveLockouts: 1, lockUntil: 1 } },
    );
    return account || null;
};

const writeLoginAudit = async (req, { account, accountType, event, remainingAttempts = null } = {}) => {
    try {
        await AuthAuditLog.create({
            accountId: account?._id || null,
            accountType,
            event,
            ipAddress: req.ip || req.socket?.remoteAddress || null,
            failedLoginAttempts: Number.isInteger(account?.failedLoginAttempts) ? account.failedLoginAttempts : null,
            consecutiveLockouts: Number.isInteger(account?.consecutiveLockouts) ? account.consecutiveLockouts : null,
            remainingAttempts,
            lockUntil: account?.lockUntil || null,
            lockDurationMinutes: account?.lockUntil && account.lockUntil > Date.now()
                ? Math.ceil((account.lockUntil.getTime() - Date.now()) / 60000)
                : null,
            requestId: req.id || null,
        });
    } catch (error) {
        console.error('[auth-audit] write_failed', JSON.stringify({ requestId: req.id, errorCode: error?.code || error?.name || 'audit_write_failed' }));
    }
};

const resetLoginState = async (model, account, passwordHash) => {
    const update = { $set: { failedLoginAttempts: 0, consecutiveLockouts: 0, lockUntil: null } };
    if (passwordHash) update.$set.password = passwordHash;
    const result = await model.updateOne(
        { _id: account._id, $or: [{ lockUntil: null }, { lockUntil: { $lte: new Date() } }] },
        update,
    );
    return result.matchedCount !== 0;
};

const failedLoginResponse = async (res, account, accountType, req) => {
    const remainingAttempts = Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - account.failedLoginAttempts);
    const locked = remainingAttempts === 0;
    await writeLoginAudit(req, {
        account,
        accountType,
        event: locked ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        remainingAttempts,
    });
    // Keep the public response identical for unknown, incorrect, and locked accounts.
    // The UI tracks attempts within the current login session; account-specific counts
    // and lock durations remain private in MongoDB and the audit log.
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
};

const lockedLoginResponse = async (req, res, account, accountType) => {
    await writeLoginAudit(req, { account, accountType, event: 'LOGIN_BLOCKED' });
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
};

export const userLoginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const searchEmail = email.toLowerCase().trim();

        // ==========================================
        // 1. REGULAR USER PATHWAY
        // ==========================================
        const regularUser = await Register.findOne({ email: searchEmail }).select('+password');

        if (regularUser) {
            // Check Lockout Status FIRST (Saves CPU time)
            if (isTemporarilyLocked(regularUser)) return await lockedLoginResponse(req, res, regularUser, 'USER');

            // Check Suspension Status
            if (regularUser.isSuspended) {
                return res.status(403).json({
                    success: false,
                    message: "Your account has been suspended."
                });
            }

            // Verify Password
            const isMatch = await verifyPassword(password, regularUser.password);

            if (!isMatch) {
                const updatedUser = await recordFailedLogin(Register, regularUser._id);
                if (!updatedUser) return await lockedLoginResponse(req, res, regularUser, 'USER');
                return await failedLoginResponse(res, updatedUser, 'USER', req);
            }

            // 🚨 NEW CHECK: Prevent unverified users from logging in
            if (!regularUser.isVerified) {
                return res.status(403).json({
                    success: false,
                    message: "Please verify your email address via OTP before logging in.",
                    isVerified: false,
                    otpExpiresAt: regularUser.otpExpires?.toISOString()
                });
            }

            const upgradedHash = isLegacyPasswordHash(regularUser.password) ? await hashPassword(password) : null;
            if (!await resetLoginState(Register, regularUser, upgradedHash)) return await lockedLoginResponse(req, res, regularUser, 'USER');

            // Generate Tokens
            // accountType identifies the backing account model. Admins created
            // in the Users collection therefore correctly have USER here;
            // their ADMIN privilege is carried independently by role.
            issueAuthTokens(res, regularUser, "USER");

            return res.status(200).json({
                success: true,
                message: "Login successful.",
                accountType: "USER",
                user: {
                    id: regularUser._id,
                    userName: regularUser.userName,
                    email: regularUser.email,
                    phone: regularUser.phone,
                    role: regularUser.role,
                    isVerified: regularUser.isVerified,
                    isSuspended: regularUser.isSuspended,
                    cart: regularUser.cart
                }
            });
        }

        // ==========================================
        // 2. DEALER SHOP USER PATHWAY
        // ==========================================
        const shopUser = await ShopRequest.findOne({ email: searchEmail }).select('+password');

        if (shopUser) {
            if (isTemporarilyLocked(shopUser)) return await lockedLoginResponse(req, res, shopUser, 'DEALER');

            const isMatch = await verifyPassword(password, shopUser.password);

            if (!isMatch) {
                const updatedShop = await recordFailedLogin(ShopRequest, shopUser._id);
                if (!updatedShop) return await lockedLoginResponse(req, res, shopUser, 'DEALER');
                return await failedLoginResponse(res, updatedShop, 'DEALER', req);
            }

            if (shopUser.status === "PENDING") {
                return res.status(403).json({
                    success: false,
                    message: "Your dealer account is still pending approval."
                });
            }

            if (shopUser.status === "REJECTED") {
                return res.status(403).json({
                    success: false,
                    message: "Your dealer request has been rejected."
                });
            }

            const upgradedHash = isLegacyPasswordHash(shopUser.password) ? await hashPassword(password) : null;
            if (!await resetLoginState(ShopRequest, shopUser, upgradedHash)) return await lockedLoginResponse(req, res, shopUser, 'DEALER');

            issueAuthTokens(res, shopUser, "DEALER");

            return res.status(200).json({
                success: true,
                message: "Login successful.",
                accountType: "DEALER",
                user: {
                    id: shopUser._id,
                    shopName: shopUser.shopName,
                    email: shopUser.email,
                    number: shopUser.number,
                    role: shopUser.role,
                    status: shopUser.status,
                    description: shopUser.description,
                    category: shopUser.category,
                    shopCertificates: shopUser.shopCertificates
                }
            });
        }

        // ==========================================
        // 3. NO ACCOUNT FOUND
        // ==========================================
        await writeLoginAudit(req, { accountType: 'UNKNOWN', event: 'LOGIN_FAILED' });
        return res.status(401).json({
            success: false,
            message: "Invalid email or password."
        });

    } catch (error) {
        console.error('[auth-login] failed', JSON.stringify({ requestId: req.id, errorCode: error?.code || error?.name || 'login_failed' }));
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};
