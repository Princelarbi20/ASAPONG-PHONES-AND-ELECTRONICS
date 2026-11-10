import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomInt } from "crypto";
import { Register } from "../../modules/userRegister.js";
import { setAuthCookies } from "../../utils/authCookies.js";
import sendEmail from "../../utils/nodemailer.js";

export const userRegisterController = async (req, res) => {
    try {
        const { userName, email, phone, password } = req.body;

        // 1. Validate mandatory input fields
        if (!userName || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields (username, email, phone, and password) are required."
            });
        }

        // Validate Name
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(userName)) {
            return res.status(400).json({
                success: false,
                message: "Name validation failed. Names cannot contain symbols or numbers."
            });
        }

        // Validate Email Syntax
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const normalizedEmail = email.toLowerCase().trim();
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address."
            });
        }

        // Validate Phone (10 digits)
        const cleanPhone = phone.replace(/\D/g, "");
        if (cleanPhone.length !== 10) {
            return res.status(400).json({
                success: false,
                message: "Phone verification failure. Contact number must be 10 digits long."
            });
        }

        // Validate Password Strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters."
            });
        }

        // 2. Duplicate Account Check
        const existingUser = await Register.findOne({
            $or: [{ email: normalizedEmail }, { phone: cleanPhone }]
        });

        if (existingUser) {
            const isEmailConflict = existingUser.email === normalizedEmail;
            return res.status(409).json({
                success: false,
                message: isEmailConflict 
                    ? "This email address is already registered." 
                    : "This phone number is already registered."
            });
        }

        // 3. Hash Password & Generate Secure OTP
        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = randomInt(100000, 1000000).toString();
        const hashOtp = await bcrypt.hash(otp, 10);
        
        // 5 Minutes Expiration Calculation
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); 

        // 4. Save New User to Database
        const newUser = new Register({
            userName: userName.trim(),
            email: normalizedEmail,
            phone: cleanPhone,
            password: hashedPassword,
            role: "USER",
            isSuspended: false,
            isVerified: false, // User must verify OTP next
            cart: [],
            otp: hashOtp,
            otpExpires: otpExpires
        });

        await newUser.save();

        // 5. Generate Authentication Tokens
        const tokenPayload = { id: newUser._id, role: newUser.role };

        const token = jwt.sign(
            tokenPayload,
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRE }
        );

        const refreshToken = jwt.sign(
            tokenPayload,
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRE }
        );

        setAuthCookies(res, token, refreshToken);

        // 6. Send Styled Verification Email
        try {
            await sendEmail({
                to: newUser.email,
                subject: "Verify your account",
                html: `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Account</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 40px 10px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e5e7eb;">
            
            <tr>
              <td align="center" style="background-color: transparent; padding: 24px 24px 12px 24px;">
                <img src="${process.env.CLOUDINARY_LOG}" alt="Asapong Logo" style="max-height: 55px; width: auto; display: block; border: 0;" />
              </td>
            </tr>

            <tr>
              <td style="padding: 32px 28px; text-align: center;">
                <h2 style="color: #111827; margin: 0 0 12px 0; font-size: 20px; font-weight: 600;">
                  Hello, ${newUser.userName}!
                </h2>
                <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 14px; line-height: 1.5;">
                  Thank you for registering. Use the One-Time Password (OTP) below to complete your account verification:
                </p>

                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 18px; margin-bottom: 24px; border: 1px dashed #d1d5db;">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; color: #4f46e5; letter-spacing: 6px;">
                    ${otp}
                  </span>
                </div>

                <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
                  ⏱️ This OTP will expire in <strong style="color: #ef4444;">5 minutes</strong>.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  If you didn't request this code, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <tr>
              <td style="background-color: #f9fafb; padding: 16px 28px; text-align: center; border-top: 1px solid #f3f4f6;">
                <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                  &copy; ${new Date().getFullYear()} Asapong Inc. All rights reserved.
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
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
        }

        // 7. Return Successful Response
        return res.status(201).json({
            success: true,
            message: "Registration successful. Please verify the OTP sent to your email.",
            accountType: "USER",
            otpExpiresAt: otpExpires.toISOString(),
            user: {
                id: newUser._id,
                userName: newUser.userName,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role,
                isVerified: newUser.isVerified
            }
        });

    } catch (error) {
        console.error("User Registration Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during registration."
        });
    }
};