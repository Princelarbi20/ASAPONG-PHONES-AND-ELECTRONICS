import mongoose from "mongoose";

const userRegisterSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 80,
        match: /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u,
    },
    phone: {
        type: String, 
        required: true,
        trim: true,
        match: /^0\d{9}$/,
        unique: true // Added database-level unique constraint
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 254,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
        type: String,
        required: true,
        select: false,
        minlength: 8,
        maxlength: 128,
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
    tokenVersion: {
        type: Number,
        default: 0,
        min: 0,
    },
    otp: {
        type: String,
        select: false // Recommended: Hide hashed OTP from default queries for security
    },
    otpExpires: { // Fixed: Corrected typo from otpEpires to otpExpires
        type: Date
    },
    otpLastSentAt: {
        type: Date,
        default: null
    },
    cart: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
            quantity: { type: Number, default: 1, min: 1, max: 1000, validate: Number.isInteger }
        }
    ]
}, { 
    timestamps: true 
});

userRegisterSchema.index({ role: 1, createdAt: -1 });
userRegisterSchema.index({ isSuspended: 1, createdAt: -1 });
userRegisterSchema.index({ userName: 1, _id: 1 });

export const Register = mongoose.model("Users", userRegisterSchema);
