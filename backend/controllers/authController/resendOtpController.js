import { randomInt } from "crypto";
import bcrypt from "bcrypt";
import { Register } from "../../modules/userRegister.js";
import sendEmail from "../../utils/nodemailer.js";
import { escapeHtml } from "../../utils/escapeHtml.js";
import { getOtpExpiryMs, OTP_RESEND_COOLDOWN_MS } from "../../config/otp.js";

export const resendOtpController = async (req, res) => {
    try {
        // 1. Validate email
        const { email } = req.body;

        if (!email || typeof email !== "string") {
            return res.status(400).json({
                success: false,
                message: "Valid email is required."
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 2. Find user
        const user = await Register.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // 3. Check verification status
        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Account is already verified."
            });
        }

        const now = Date.now();
        const lastSentAt = user.otpLastSentAt?.getTime?.();
        if (lastSentAt && now - lastSentAt < OTP_RESEND_COOLDOWN_MS) {
            const retryAfterSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - lastSentAt)) / 1000);
            return res.status(429).json({
                success: false,
                message: `Please wait ${retryAfterSeconds} seconds before requesting another OTP.`,
                retryAfterSeconds
            });
        }

        // 4. Generate OTP
        const otp = randomInt(100000, 1000000).toString();

        const hashedOtp = await bcrypt.hash(otp, 10);

        // 5. Set expiration
        const otpExpiryMs = getOtpExpiryMs();
        const otpExpires = new Date(now + otpExpiryMs);

        // Reserve the cooldown before delivery so repeated requests cannot flood the mail service.
        user.otpLastSentAt = new Date(now);
        await user.save();

        // 6. Confirm recipient exists
        if (!user.email) {
            return res.status(400).json({
                success: false,
                message: "User does not have a registered email."
            });
        }
       
        // 7. Send OTP email
        const emailResult = await sendEmail({
            from: process.env.EMAIL_USER,
            to:user.email,
            subject: "Verify your OTP ",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Account Verification</title>
                </head>

                <body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">

                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td align="center" style="padding:40px 10px;">

                                <table width="100%" cellpadding="0" cellspacing="0"
                                    style="max-width:480px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;">

                                    <tr>
                                        <td align="center" style="padding:24px;">
                                            <img
                                                src="${process.env.CLOUDINARY_LOG}"
                                                alt="Asapong Logo"
                                                style="max-height:55px;width:auto;"
                                            />
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="padding:32px 28px;text-align:center;">

                                            <h2 style="color:#111827;">
                                                Hello, ${escapeHtml(user.userName)}!
                                            </h2>

                                            <p style="color:#4b5563;font-size:14px;line-height:1.5;">
                                                Your verification code has been resent.
                                                Use the OTP below to verify your account.
                                            </p>

                                            <div style="background:#f3f4f6;padding:18px;border-radius:8px;margin:24px 0;border:1px dashed #d1d5db;">

                                                <span style="font-family:monospace;font-size:32px;font-weight:bold;color:#4f46e5;letter-spacing:6px;">
                                                    ${otp}
                                                </span>

                                            </div>

                                            <p style="color:#6b7280;font-size:12px;">
                                                This OTP expires in
                                                <strong style="color:#ef4444;">${Math.ceil(otpExpiryMs / 60000)} minutes</strong>.
                                            </p>

                                            <p style="color:#9ca3af;font-size:12px;">
                                                If you did not request this code, ignore this email.
                                            </p>

                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="background:#f9fafb;padding:16px;text-align:center;">
                                            <p style="color:#9ca3af;font-size:11px;">
                                                &copy; ${new Date().getFullYear()} Asapong Inc.
                                                All rights reserved.
                                            </p>
                                        </td>
                                    </tr>

                                </table>

                            </td>
                        </tr>
                    </table>

                </body>
                </html>
                `
        });
        if (!emailResult?.success) {
            // A failed delivery should not make the user wait through the
            // resend cooldown; the OTP itself is only committed after send.
            user.otpLastSentAt = null;
            await user.save();
            console.error('Resend OTP email was not delivered:', emailResult?.error || 'Email service returned an unsuccessful result.');
            return res.status(503).json({
                success: false,
                message: 'We could not send the verification email. Please try again later.'
            });
        }

        // 8. Save OTP after successful email submission
        user.otp = hashedOtp;
        user.otpExpires = otpExpires;

        await user.save();

        // 9. Success response
        return res.status(200).json({
            success: true,
            message: "OTP has been sent successfully.",
            otpExpiresAt: otpExpires.toISOString()
        });

    } catch (error) {
        console.error("Resend OTP controller error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};
