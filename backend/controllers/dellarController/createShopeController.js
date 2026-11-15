
import { ShopRequest } from "../../modules/shopRequestSchema.js";
import bcrypt from 'bcrypt';

export const createShopRequest = async (req, res, next) => {
  try {
    const { shopName, description, category, email, number, password } = req.body;

    if (!shopName || !description || !category || !email || !number || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.'
      });
    }

    // 1. Verify if the file middleware processed any files (using req.files)
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload your business registration/shop certificate in PDF format.'
      });
    }

    // 2. Double-check that ALL uploaded files are strictly PDFs
    const allFilesArePDFs = req.files.every(file => file.mimetype === 'application/pdf');
    if (!allFilesArePDFs) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. Only PDF documents are allowed.'
      });
    }

    // 3. Check duplicate requests using the email
    const existingRequest = await ShopRequest.findOne({
      email,
      status: { $in: ['PENDING', 'APPROVED'] }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'There is already an active or pending shop application tied to this business email.'
      });
    }

    // 4. Check if the shop name is unique
    const nameExists = await ShopRequest.findOne({ shopName });
    if (nameExists) {
      return res.status(400).json({
        success: false,
        message: 'This shop name is already taken or under review.'
      });
    }

    // 5. Gather file location metadata for all uploaded documents
    // 👈 FIXED: Force path string to normalize with forward web-slashes and clean filename spaces
    const certificates = req.files.map(file => {
      const standardWebPath = `/uploads/certificates/${file.filename}`;
      return {
        url: standardWebPath.replace(/\\/g, '/'),
        filename: file.originalname
      };
    });

    // 6. Create the Document without forcing an owner relationship
    const hashedPassword = await bcrypt.hash(password, 10);
    const newRequest = await ShopRequest.create({
      shopName,
      description,
      category,
      email,
      number,
      shopCertificates: certificates,
      status: "PENDING",
      password: hashedPassword
    });

    res.status(201).json({
      success: true,
      message: 'Shop creation request along with documents submitted successfully.',
      data: {
        id: newRequest._id,
        shopName: newRequest.shopName,
        email: newRequest.email,
        status: newRequest.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
