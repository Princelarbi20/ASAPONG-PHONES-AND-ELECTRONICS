import multer from 'multer';
import path from 'node:path';

const safeFilename = (name) => path.basename(name)
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');

const certificateUpload = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/certificates');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + safeFilename(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed.'), false);
    }
};

export const certificate = multer({
    storage: certificateUpload,
    limits: { fileSize: 5 * 1024 * 1024, files: 3 },
    fileFilter
});
