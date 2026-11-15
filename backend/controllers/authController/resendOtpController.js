import { randomInt } from "crypto";
import bcrypt from "bcrypt";
import { Register } from "../../modules/userRegister.js";
import { enqueueEmail } from "../../utils/emailQueue.js";

export const resendOtpController = async (req, res) => {
  const startedAt = Date.now();
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") return res.status(400).json({ success: false, message: "Valid email is required." });
    const normalizedEmail = email.toLowerCase().trim();
    let user = await Register.findOne({ email: normalizedEmail }).select("+otp");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.isVerified) return res.status(400).json({ success: false, message: "Account is already verified." });

    const now = Date.now();
    const cooldownMs = 30_000;
    if (user.otpLastSentAt && now - user.otpLastSentAt.getTime() < cooldownMs) {
      const retryAfterSeconds = Math.ceil((cooldownMs - (now - user.otpLastSentAt.getTime())) / 1000);
      return res.status(429).json({ success: false, message: `Please wait ${retryAfterSeconds} seconds before requesting another code.` });
    }

    const previousSentAt = user.otpLastSentAt;
    user = await Register.findOneAndUpdate(
      { _id: user._id, isVerified: false, $or: [{ otpLastSentAt: null }, { otpLastSentAt: { $lte: new Date(now - cooldownMs) } }] },
      { $set: { otpLastSentAt: new Date(now) } },
      { new: true }
    ).select("+otp");
    if (!user) return res.status(429).json({ success: false, message: "A verification code was requested recently. Please wait before trying again." });

    const otp = randomInt(100000, 1000000).toString();
    const otpHashStartedAt = Date.now();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(now + 10 * 60 * 1000);
    const previousOtp = user.otp;
    const previousExpiry = user.otpExpires;
    user.otp = hashedOtp;
    user.otpExpires = otpExpires;
    user.otpLastSentAt = new Date(now);
    await user.save();

    const safeName = user.userName.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    try {
      await enqueueEmail({
      to: user.email,
      subject: "Verify your account",
      html: `<p>Hello, ${safeName}.</p><p>Your verification code is:</p><p style="font: bold 32px monospace; letter-spacing: 6px">${otp}</p><p>This code expires in 10 minutes.</p>`,
      }, { requestId: req.id, userId: user._id, otpHash: hashedOtp });
    } catch (queueError) {
      user.otp = previousOtp;
      user.otpExpires = previousExpiry;
      user.otpLastSentAt = previousSentAt;
      await user.save();
      throw queueError;
    }

    console.info(JSON.stringify({ event: "otp_resend_timing", requestId: req.id, operation: "otp_hash", durationMs: Date.now() - otpHashStartedAt }));
    console.info(JSON.stringify({ event: "otp_resend_timing", requestId: req.id, operation: "total", durationMs: Date.now() - startedAt }));
    return res.status(200).json({ success: true, message: "Verification code queued for delivery.", otpExpiresAt: otpExpires.toISOString() });
  } catch (error) {
    console.error(JSON.stringify({ event: "otp_resend_error", requestId: req.id, message: error.message, durationMs: Date.now() - startedAt }));
    return res.status(500).json({ success: false, message: "Unable to resend the verification code. Please try again." });
  }
};
