import mongoose from "mongoose";

export const shopRequestSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users' // Aligned with your user collection name
  },
  shopName: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Shop description is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Shop category is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Business email is required'],
    lowercase: true,
    trim: true,
    unique: true
  },
  number: { 
    type: String,
    required: [true, 'Contact number is required']
  },
  password: { 
    type: String,
    required: [true, 'Password is required'],
    select: false
  },
  shopCertificates: {
    type: [
      {
        url: {
          type: String,
          required: [true, 'Certificate PDF URL is required']
        },
        filename: {
          type: String
        }
      }
    ],
    validate: [
      {
        validator: function(val) {
          return val.length > 0;
        },
        message: 'At least one shop certificate PDF is required.'
      },
      {
        validator: function(val) {
          return val.length <= 3;
        },
        message: 'You cannot upload more than 3 certificates.'
      }
    ]
  },
  role: {
    type: String,
    enum: ['ADMIN', 'USER', 'DEALER', 'DELLAER'], 
    default: 'DEALER'
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  adminNotes: {
   type: [String],
   default: []
  }
}, {
  timestamps: true
});

export const ShopRequest = mongoose.model('ShopRequest', shopRequestSchema);
