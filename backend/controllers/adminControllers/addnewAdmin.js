import { Register } from "../../modules/userRegister.js";
import bcrypt from 'bcrypt';

export const addnewAdmin = async (req, res) => {
  try {
    const { userName, phone, email, password } = req.body;

    // 1. Verify credentials input fields
    if (!userName || !phone || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All registration fields are required" // Fixed typo: massage -> message
      });
    }

    // 2. Check if user already exists (Added missing 'await')
    const findUser = await Register.findOne({ email: email.toLowerCase() });
    if (findUser) {
      return res.status(400).json({
        success: false,
        message: "This email has already been registered"
      });
    }

    // 3. Hash the password safely (Added missing 'await')
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create the new Admin record in MongoDB (Added missing 'await')
    // Model.create automatically saves the document, no need for .save()
    const newAdmin = await Register.create({
      userName,
      phone,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "ADMIN"
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
    console.error("Admin registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during registration."
    });
  }
};
