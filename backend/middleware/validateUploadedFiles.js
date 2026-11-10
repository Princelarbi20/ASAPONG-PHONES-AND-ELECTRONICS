import { open, unlink } from 'node:fs/promises';

const isImage = (buffer) =>
  buffer.subarray(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF])) ||
  buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) ||
  (buffer.subarray(0, 4).equals(Buffer.from('RIFF')) && buffer.subarray(8, 12).equals(Buffer.from('WEBP')));

const isPdf = (buffer) => buffer.subarray(0, 5).equals(Buffer.from('%PDF-'));

const removeFiles = async (files) => Promise.all(
  files.map((file) => unlink(file.path).catch(() => undefined))
);

const isLocalFilePath = (filePath) => {
  if (!filePath) return false;

  try {
    const parsed = new URL(filePath);
    return parsed.protocol === 'file:';
  } catch {
    return !/^https?:\/\//i.test(filePath);
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
      const isValid = type === 'image' ? isImage(header) : isPdf(header);
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
