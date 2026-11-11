import { Register } from "../../modules/userRegister.js";
import sendEmail from "../../utils/nodemailer.js";
import { escapeHtml } from "../../utils/escapeHtml.js";

export const suspendUserController = async (req,res,next) => {
  try {
    const { id } = req.params;

    const user = await Register.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isSuspended = true;
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();

    await sendEmail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Account Suspension Notice",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Account Suspended</title>
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
                                                We are writing to inform you that your account has been 
                                                <strong style="color:#ef4444;">suspended</strong> due to a violation of our terms or policies.
                                            </p>

                                            <div style="background:#f3f4f6;padding:18px;border-radius:8px;margin:24px 0;border:1px dashed #d1d5db;">
                                                <span style="font-size:14px;font-weight:bold;color:#374151;">
                                                    If you believe this is a mistake, please contact our support team.
                                                </span>
                                            </div>

                                            <p style="color:#9ca3af;font-size:12px;">
                                                If you did not expect this, please ignore or reach out to helpdesk.
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

    res.status(200).json({
      success: true,
      message: "User suspended successfully",
      user,
    });
  } catch (err) {
    next(err);
  }
};
