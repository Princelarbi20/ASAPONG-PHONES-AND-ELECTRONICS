import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { fileURLToPath } from "url";
import { hasImageSignature } from "../utils/fileSignatures.js";
import { trackLocalUpload } from "../utils/uploadCleanup.js";
import { createCloudinaryMulterStorage, createSignatureInspector } from "../utils/cloudinaryMulterStorage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = process.env.NODE_ENV === 'test'
  ? path.resolve(process.env.TEST_UPLOAD_DIR || path.join(__dirname, '..', '..', '.test-uploads', 'products'))
  : path.join(__dirname, "..", "uploads", "products");
const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const inspectImageStream = () => {
  return createSignatureInspector(hasImageSignature, 'image');
};

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const cloudinaryConfigured = process.env.NODE_ENV !== 'test' && Boolean(
  process.env.CLOUDINARY_NAME?.trim() &&
  process.env.CLOUDINARY_API_KEY?.trim() &&
  process.env.CLOUDINARY_API_SECRET?.trim()
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
  });
}

const cloudinaryStorage = cloudinaryConfigured
  ? createCloudinaryMulterStorage({ cloudinary, folder: 'products', inspectStream: inspectImageStream })
  : null;

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9.-]/g, "");
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
    trackLocalUpload(req, path.join(uploadDir, filename));
    cb(null, filename);
  },
});

export const upload = multer({
  storage: cloudinaryStorage || diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedImageMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    const error = new Error("Only JPEG, PNG, and WebP images are allowed.");
    error.statusCode = 400;
    cb(error);
  },
});
