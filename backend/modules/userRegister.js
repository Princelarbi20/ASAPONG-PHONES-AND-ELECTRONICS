import mongoose from "mongoose";

const userRegisterSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        trim: true 
    },
    phone: {
        type: String, 
        required: true,
        unique: true // Added database-level unique constraint
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    role: {
        type: String,
        enum: ['USER', 'ADMIN', 'DEALER'], 
        default: "USER" , 
    },
    isVerified: { // Fixed: Added missing verification state
        type: Boolean,
        default: false
    },
    isSuspended: {
        type: Boolean,
        default: false
    },
    failedLoginAttempts: {
        type: Number,
        default: 0,
    },
    lockUntil: {
        type: Date,
        default: null,
    },
    otp: {
        type: String,
        select: false // Recommended: Hide hashed OTP from default queries for security
    },
    otpExpires: { // Fixed: Corrected typo from otpEpires to otpExpires
        type: Date
    },
    cart: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
            quantity: { type: Number, default: 1 }
        }
    ]
}, { 
    timestamps: true 
});

export const Register = mongoose.model("Users", userRegisterSchema);