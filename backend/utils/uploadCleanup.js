import { unlink } from 'node:fs/promises';
import { v2 as cloudinary } from 'cloudinary';

const partialUploads = Symbol.for('asapong.partialUploads');
const uploadsCommitted = Symbol.for('asapong.uploadsCommitted');

export const trackLocalUpload = (req, filePath) => {
  if (!req[partialUploads]) req[partialUploads] = new Set();
  req[partialUploads].add(filePath);
};

export const trackUploadedFile = (req, file) => {
  if (!req[partialUploads]) req[partialUploads] = new Set();
  req[partialUploads].add(file);
};

export const commitUploadedFiles = (req) => {
  if (req) req[uploadsCommitted] = true;
  req?.[partialUploads]?.clear();
};

export const cleanupPartialUploads = async (req, cloudinaryClient = cloudinary) => {
  const files = req?.[partialUploads];
  if (!files?.size) return;
  const pending = [...files];
  files.clear();
  await Promise.all(pending.map(async (file) => {
    if (typeof file === 'string') {
      await unlink(file).catch((error) => { if (error.code !== 'ENOENT') throw error; });
      return;
    }
    if (file?.filename && /^https?:\/\//i.test(file.path || '')) {
      const resource_type = file.resource_type || 'image';
      const type = file.delivery_type || 'upload';
      await cloudinaryClient.uploader.destroy(file.filename, { resource_type, type, invalidate: true });
      return;
    }
    if (file?.path) await unlink(file.path).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }));
};
