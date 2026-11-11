import { open, unlink } from 'node:fs/promises';
import { v2 as cloudinary } from 'cloudinary';
import { hasImageSignature, hasPdfSignature } from '../utils/fileSignatures.js';

const removeFiles = async (files) => Promise.all(
  files.map((file) => unlink(file.path).catch(() => undefined))
);

export const cleanupUploadedFiles = async (files = []) => Promise.all(files.map(async (file) => {
  if (/^https?:\/\//i.test(file?.path || '') && file?.filename) {
    await new Promise((resolve) => {
      try {
        cloudinary.uploader.destroy(file.filename, { invalidate: true }, () => resolve());
      } catch {
        resolve();
      }
    });
    return;
  }
  if (file?.path) await unlink(file.path).catch(() => undefined);
}));

const isLocalFilePath = (filePath) => {
  if (typeof filePath !== 'string' || !filePath) return false;
  if (/^https?:\/\//i.test(filePath)) return false;
  if (/^[a-z]:[\\/]/i.test(filePath)) return true;

  try {
    const parsed = new URL(filePath);
    return parsed.protocol === 'file:';
  } catch {
    return true;
  }
};

const validate = (type) => async (req, res, next) => {
  const files = req.files || [];
  try {
    for (const file of files) {
      const filePath = file?.path;

      if (!filePath || !isLocalFilePath(filePath)) {
        continue;
      }

      const handle = await open(filePath, 'r');
      const header = Buffer.alloc(12);
      await handle.read(header, 0, header.length, 0);
      await handle.close();
      const isValid = type === 'image' ? hasImageSignature(header) : hasPdfSignature(header);
      if (!isValid) {
        await removeFiles(files);
        const error = new Error(`Invalid ${type} file content.`);
        error.statusCode = 400;
        return next(error);
      }
    }
    return next();
  } catch (error) {
    await removeFiles(files);
    return next(error);
  }
};

export const validateImages = validate('image');
export const validatePdfs = validate('pdf');
