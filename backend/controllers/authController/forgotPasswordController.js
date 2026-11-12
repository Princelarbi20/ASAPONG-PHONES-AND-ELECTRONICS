
import bcrypt from "bcrypt";

import { Register } from "../../modules/userRegister.js";
import { PasswordResetOTP } from "../../modules/passwordResetOTP.js";

import sendEmail from "../../utils/nodemailer.js";
import { escapeHtml } from "../../utils/escapeHtml.js";

import {
    createResetOtp,
    RESET_OTP_TTL_MS,
    RESET_FLOW_TTL_MS,
    RESET_REQUESTS_PER_WINDOW,
    RESET_REQUEST_WINDOW_MS,
    createResetFlowId,
    hashResetSecret,
    getPasswordResetOtpEmail
} from "../../utils/passwordReset.js";

const genericMessage = "If an account is eligible, a verification code will be sent. You can continue to enter a code.";
const genericResponse = (flowId, expiresAt) => ({
    success: true,
    message: genericMessage,
    ...(flowId ? { flowId, flowExpiresAt: expiresAt } : {})
});


export const forgotPasswordController = async (req, res) => {
    let flowId;
    let flowExpiresAt;
    try {

        // 1. Validate email input
        const rawEmail = req.body?.email;

        if (
            typeof rawEmail !== "string" ||
            !rawEmail.trim()
        ) {
            return res.status(200).json(genericResponse());
        }

        const email = rawEmail.trim().toLowerCase();

        // 2. Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(200).json(genericResponse());
        }

        const flowIssuedAt = Date.now();
        flowId = createResetFlowId(email, flowIssuedAt);
        flowExpiresAt = new Date(flowIssuedAt + RESET_FLOW_TTL_MS);

        // 3. Check whether the customer is registered,
        // verified and not suspended
        const user = await Register.findOne({
            email,
            isVerified: true,
            isSuspended: false
        });

        // 4. Do not reveal whether the email exists
        if (!user) {
            return res.status(200).json(genericResponse(flowId, flowExpiresAt));
        }

        const now = new Date();

        // 5. Find existing password reset record
        const record = await PasswordResetOTP.findOne({
            userId: user._id
        }).select("+otpHash +authorizationHash");

        // 6. Check OTP request rate limit
        const sameWindow =
            record &&
            record.requestWindowStartedAt &&
            now - record.requestWindowStartedAt < RESET_REQUEST_WINDOW_MS;

        if (
            sameWindow &&
            record.requestCount >= RESET_REQUESTS_PER_WINDOW
        ) {
            await PasswordResetOTP.updateOne(
                { userId: user._id },
                { $set: { flowIdHash: hashResetSecret(flowId), flowIdExpiresAt: flowExpiresAt } }
            );
            return res.status(200).json(genericResponse(flowId, flowExpiresAt));
        }

        // 7. Generate secure OTP
        const otp = createResetOtp();

        // 8. Hash OTP before database storage
        const otpHash = await bcrypt.hash(otp, 10);

        const otpExpiresAt = new Date(
            now.getTime() + RESET_OTP_TTL_MS
        );

        // 9. Prepare database update
        const updateFields = {
            otpHash,
            otpExpiresAt,
            otpAttempts: 0,
            flowIdHash: hashResetSecret(flowId),
            flowIdExpiresAt: flowExpiresAt,

            // Invalidate previous reset authorization
            authorizationHash: null,
            authorizationExpiresAt: null,

            // Database cleanup expiration
            expiresAt: new Date(
                now.getTime() + 24 * 60 * 60 * 1000
            )
        };

        const filter = {
            userId: user._id
        };

        const update = {
            $set: updateFields
        };

        if (!record) {

            update.$set.requestWindowStartedAt = now;
            update.$set.requestCount = 1;

        } else if (sameWindow) {

            filter.requestCount = {
                $lt: RESET_REQUESTS_PER_WINDOW
            };

            filter.requestWindowStartedAt =
                record.requestWindowStartedAt;

            update.$inc = {
                requestCount: 1
            };

        } else {

            filter.requestWindowStartedAt =
                record.requestWindowStartedAt;

            update.$set.requestWindowStartedAt = now;
            update.$set.requestCount = 1;
        }

        // 10. Atomically update or create the OTP record
        const updated = await PasswordResetOTP.findOneAndUpdate(
            filter,
            update,
            {
                upsert: !record,
                new: true,
                setDefaultsOnInsert: true,
                runValidators: true
            }
        );

        if (!updated) {
            return res.status(200).json(genericResponse(flowId, flowExpiresAt));
        }

        // 11. Send OTP email
        const result = await sendEmail({
            to: user.email,

            subject: "Your Asa Phones Password Reset Code",

            text: `
Your Asa Phones password reset code is: ${otp}

This code expires in 5 minutes.

Do not share this code with anyone.
If you did not request this, you can ignore this email.
            `,

            html: getPasswordResetOtpEmail({
                userName: escapeHtml(user.userName || "Customer"),
                otp,
                expiresMinutes: 5
            })
        });

        // 12. Handle email delivery failure
        if (!result?.success) {

            await PasswordResetOTP.updateOne(
                {
                    userId: user._id,
                    otpHash
                },
                {
                    $set: {
                        otpHash: null,
                        otpExpiresAt: null,
                        flowIdHash: null,
                        flowIdExpiresAt: null
                    }
                }
            );

            console.error(
                "Password reset email delivery failed."
            );

            return res.status(200).json(genericResponse(flowId, flowExpiresAt));
        }

        // 13. Return generic response
        return res.status(200).json(genericResponse(flowId, flowExpiresAt));

    } catch (error) {

        console.error(
            "Forgot password request failed:",
            error?.message || "Unknown error"
        );

        return res.status(200).json(genericResponse(flowId, flowExpiresAt));
    }
};
