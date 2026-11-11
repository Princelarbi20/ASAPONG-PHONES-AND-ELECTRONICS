import { Register } from "../../modules/userRegister.js";
import bcrypt from 'bcrypt';

export const addnewAdmin = async (req, res) => {
  try {
    const { userName, phone, email, password, role = 'ADMIN' } = req.body;

    // 1. Verify credentials input fields
    if (!userName || !phone || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All registration fields are required" // Fixed typo: massage -> message
      });
    }

    // 2. Check if user already exists (Added missing 'await')
    const normalizedEmail = email.trim().toLowerCase();
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('233') && normalizedPhone.length === 12) normalizedPhone = `0${normalizedPhone.slice(3)}`;
    const findUser = await Register.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] });
    if (findUser) {
      return res.status(409).json({
        success: false,
        message: "This email has already been registered"
      });
    }

    // 3. Hash the password safely (Added missing 'await')
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create the new Admin record in MongoDB (Added missing 'await')
    // Model.create automatically saves the document, no need for .save()
    const newAdmin = await Register.create({
      userName: userName.trim(),
      phone,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role,
      isVerified: true,
    });

    // Do not return a credential for another account in this response.
    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      user: {
        id: newAdmin._id,
        userName: newAdmin.userName,
        role: newAdmin.role,
        email: newAdmin.email,
        phone: newAdmin.phone
      }
    });

  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: 'An account already exists with that email or phone number.' });
    console.error("Admin registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during registration."
    });
  }
};
