import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 120
    },
    description: { 
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },
    price: { 
        type: Number,
        required: true,
        min: 0,
        max: 100000000,
        validate: {
            validator: Number.isInteger,
            message: "Product price must be a whole number."
        }
    },
    category: { 
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100,
        index: true 
    },
    brand: {              
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        max: 1000000,
        validate: Number.isInteger
    },
    images: [ 
        { type: String, maxlength: 2048 }
    ],
    imagePublicIds: [
        { type: String, maxlength: 255 }
    ],
    rating: {             
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: Number.isFinite,
        default: 1
    },
    shop: {
        type: String,
        ref: 'ShopRequest', 
        required: true,
        trim: true,
        maxlength: 120
    },
    newArrival:{
        type: Boolean,
    },
    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING" 
    },
    specifications: [
        {
            key: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
            value: { type: String, required: true, trim: true, maxlength: 1000 }
        }
    ]
}, {
    timestamps: true
});

productSchema.index({ category: 1, "specifications.key": 1, "specifications.value": 1 });

export const Product = mongoose.model("Product", productSchema);
