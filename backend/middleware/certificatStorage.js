import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { hasPdfSignature } from '../utils/fileSignatures.js';
import { trackLocalUpload } from '../utils/uploadCleanup.js';
import { createCloudinaryMulterStorage, createSignatureInspector } from '../utils/cloudinaryMulterStorage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.NODE_ENV === 'test'
    ? path.resolve(process.env.TEST_UPLOAD_DIR || path.join(__dirname, '..', '..', '.test-uploads', 'certificates'))
    : path.join(__dirname, '..', 'uploads', 'certificates');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const cloudinaryConfigured = process.env.NODE_ENV !== 'test' && Boolean(
    process.env.CLOUDINARY_NAME?.trim() && process.env.CLOUDINARY_API_KEY?.trim() && process.env.CLOUDINARY_API_SECRET?.trim()
);
if (cloudinaryConfigured) cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
});

const safeFilename = (name) => path.basename(name)
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');

const certificateCloudinaryStorage = cloudinaryConfigured
    ? createCloudinaryMulterStorage({
        cloudinary,
        resourceType: 'raw',
        deliveryType: 'authenticated',
        publicIdPrefix: 'dealer-certificates-',
        publicIdExtension: '.pdf',
        inspectStream: () => createSignatureInspector(hasPdfSignature, 'PDF'),
    })
    : null;

const certificateDiskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + '-' + safeFilename(file.originalname);
        trackLocalUpload(req, path.join(uploadDir, filename));
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        const error = new Error('Only PDF files are allowed.');
        error.statusCode = 400;
        cb(error, false);
    }
};

export const certificate = multer({
    storage: certificateCloudinaryStorage || certificateDiskStorage,
    limits: { fileSize: 5 * 1024 * 1024, files: 3 },
    fileFilter
});
