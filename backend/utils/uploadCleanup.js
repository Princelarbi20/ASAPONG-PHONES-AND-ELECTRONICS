import { unlink } from 'node:fs/promises';

const partialUploads = Symbol.for('asapong.partialUploads');

export const trackLocalUpload = (req, filePath) => {
  if (!req[partialUploads]) req[partialUploads] = new Set();
  req[partialUploads].add(filePath);
};

export const cleanupPartialUploads = async (req) => {
  const paths = req?.[partialUploads];
  if (!paths?.size) return;
  await Promise.all([...paths].map((filePath) => unlink(filePath).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  })));
  paths.clear();
};
