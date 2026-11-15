import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: { 
        type: String,
        required: true
    },
    price: { 
        type: Number,
        required: true
    },
    category: { 
        type: String,
        required: true,
        index: true 
    },
    brand: {              
        type: String,
        required: true,
        trim: true
    },
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    images: [ 
        { type: String }
    ],
    imagePublicIds: [
        { type: String }
    ],
    rating: {             
        type: Number,
        required: true,
        min: 1,
        max: 5,
        default: 1
    },
    shop: {
        type: String,
        ref: 'ShopRequest', 
        required: true
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
            key: { type: String, required: true },   
            value: { type: String, required: true } 
        }
    ]
}, {
    timestamps: true
});

productSchema.index({ category: 1, "specifications.key": 1, "specifications.value": 1 });

export const Product = mongoose.model("Product", productSchema);