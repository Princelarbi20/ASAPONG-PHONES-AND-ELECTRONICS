import fs from "node:fs";
import path from "node:path";
import { pipeline, Transform } from "node:stream";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { fileURLToPath } from "url";
import { hasImageSignature } from "../utils/fileSignatures.js";
import { trackLocalUpload } from "../utils/uploadCleanup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = process.env.NODE_ENV === 'test'
  ? path.resolve(process.env.TEST_UPLOAD_DIR || path.join(__dirname, '..', '..', '.test-uploads', 'products'))
  : path.join(__dirname, "..", "uploads", "products");
const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const inspectImageStream = () => {
  let prefix = Buffer.alloc(0);
  let inspected = false;
  return new Transform({
    transform(chunk, encoding, callback) {
      if (inspected) {
        callback(null, chunk);
        return;
      }
      prefix = Buffer.concat([prefix, chunk]);
      if (prefix.length < 12) {
        callback();
        return;
      }
      if (!hasImageSignature(prefix)) {
        const error = new Error("Invalid image file content.");
        error.statusCode = 400;
        callback(error);
        return;
      }
      inspected = true;
      callback(null, prefix);
      prefix = Buffer.alloc(0);
    },
    flush(callback) {
      if (!inspected && hasImageSignature(prefix)) {
        callback(null, prefix);
        return;
      }
      if (!inspected) {
        const error = new Error("Invalid image file content.");
        error.statusCode = 400;
        callback(error);
        return;
      }
      callback();
    },
  });
};

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const cloudinaryConfigured = process.env.NODE_ENV !== 'test' && Boolean(
  process.env.CLOUDINARY_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const cloudinaryStorage = cloudinaryConfigured
  ? {
      _handleFile(req, file, cb) {
        const safeBaseName = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "image";
        const publicId = `${Date.now()}-${safeBaseName}`;
        const uploadOptions = {
          folder: "products",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          public_id: publicId,
        };

        let uploadStream;
        let uploadResult;
        let pipelineCompleted = false;
        let settled = false;

        const cleanUpUploadedAsset = (assetPublicId, done) => {
          try {
            cloudinary.uploader.destroy(assetPublicId, { invalidate: true }, (cleanupError) => {
              if (cleanupError) {
                console.error("Failed to clean up Cloudinary upload:", cleanupError);
              }
              done();
            });
          } catch (cleanupError) {
            console.error("Failed to clean up Cloudinary upload:", cleanupError);
            done();
          }
        };

        const finishWithError = (error) => {
          if (settled) return;
          settled = true;

          if (!file.stream.destroyed) file.stream.destroy();
          if (uploadStream && !uploadStream.destroyed) uploadStream.destroy();

          if (uploadResult?.public_id) {
            cleanUpUploadedAsset(uploadResult.public_id, () => cb(error));
          } else {
            cb(error);
          }
        };

        const finishIfReady = () => {
          if (settled || !pipelineCompleted || !uploadResult) return;

          if (!uploadResult.secure_url || !uploadResult.public_id) {
            finishWithError(new Error("Cloudinary returned incomplete upload metadata."));
            return;
          }

          settled = true;
          // Match multer-storage-cloudinary's existing file contract exactly.
          cb(null, {
            path: uploadResult.secure_url,
            size: uploadResult.bytes,
            filename: uploadResult.public_id,
          });
        };

        try {
          uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (settled) {
              if (result?.public_id) {
                cleanUpUploadedAsset(result.public_id, () => {});
              }
              return;
            }

            if (error) {
              finishWithError(error);
              return;
            }

            uploadResult = result;
            finishIfReady();
          });

          pipeline(file.stream, inspectImageStream(), uploadStream, (error) => {
            if (error) {
              finishWithError(error);
              return;
            }

            pipelineCompleted = true;
            finishIfReady();
          });
        } catch (error) {
          finishWithError(error);
        }
      },

      _removeFile(req, file, cb) {
        if (!file.filename) {
          cb(null);
          return;
        }

        try {
          cloudinary.uploader.destroy(file.filename, { invalidate: true }, cb);
        } catch (error) {
          cb(error);
        }
      },
    }
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
