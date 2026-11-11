import path from 'node:path';
import { pipeline, Transform } from 'node:stream';
import { trackUploadedFile } from './uploadCleanup.js';

export const createSignatureInspector = (isValidSignature, label) => {
  let prefix = Buffer.alloc(0);
  let inspected = false;
  return new Transform({
    transform(chunk, encoding, callback) {
      if (inspected) return callback(null, chunk);
      prefix = Buffer.concat([prefix, chunk]);
      if (prefix.length < 12) return callback();
      if (!isValidSignature(prefix)) {
        const error = new Error(`Invalid ${label} file content.`);
        error.statusCode = 400;
        return callback(error);
      }
      inspected = true;
      callback(null, prefix);
      prefix = Buffer.alloc(0);
    },
    flush(callback) {
      if (!inspected && isValidSignature(prefix)) return callback(null, prefix);
      if (!inspected) {
        const error = new Error(`Invalid ${label} file content.`);
        error.statusCode = 400;
        return callback(error);
      }
      callback();
    },
  });
};

export const createCloudinaryMulterStorage = ({ cloudinary, folder, resourceType = 'image', deliveryType = 'upload', inspectStream, publicIdPrefix = '', publicIdExtension = '' }) => ({
  _handleFile(req, file, cb) {
    const safeName = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 70) || 'upload';
    const publicId = `${publicIdPrefix}${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}${publicIdExtension}`;
    const options = {
      ...(folder ? { folder } : {}),
      public_id: publicId,
      resource_type: resourceType,
      type: deliveryType,
      ...(resourceType === 'image' ? { allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] } : {}),
    };
    let uploadStream;
    let result;
    let pipelineDone = false;
    let finished = false;
    const destroy = (id, callback) => {
      if (!id) return callback?.();
      cloudinary.uploader.destroy(id, { resource_type: resourceType, type: deliveryType, invalidate: true }, () => callback?.());
    };
    const fail = (error) => {
      if (finished) return;
      finished = true;
      if (uploadStream && !uploadStream.destroyed) uploadStream.destroy();
      if (result?.public_id) destroy(result.public_id, () => cb(error));
      else cb(error);
    };
    const complete = () => {
      if (finished || !pipelineDone || !result) return;
      if (!result.secure_url || !result.public_id) return fail(new Error('Cloudinary returned incomplete upload metadata.'));
      finished = true;
      const stored = {
        path: result.secure_url,
        size: result.bytes,
        filename: result.public_id,
        resource_type: resourceType,
        delivery_type: deliveryType,
      };
      trackUploadedFile(req, stored);
      cb(null, stored);
    };
    try {
      uploadStream = cloudinary.uploader.upload_stream(options, (error, uploaded) => {
        if (finished) {
          if (uploaded?.public_id) destroy(uploaded.public_id, () => {});
          return;
        }
        if (error) return fail(error);
        result = uploaded;
        complete();
      });
      pipeline(file.stream, ...(inspectStream ? [inspectStream()] : []), uploadStream, (error) => {
        if (error) return fail(error);
        pipelineDone = true;
        complete();
      });
    } catch (error) {
      fail(error);
    }
  },
  _removeFile(req, file, cb) {
    if (!file?.filename) return cb(null);
    cloudinary.uploader.destroy(file.filename, {
      resource_type: file.resource_type || resourceType,
      type: file.delivery_type || deliveryType,
      invalidate: true,
    }, (error) => cb(error || null));
  },
});
