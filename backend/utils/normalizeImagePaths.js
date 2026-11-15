import path from 'node:path';

export const normalizeUploadedImagePaths = (files = []) =>
  (files || [])
    .map((file) => {
      if (!file) return '';

      if (typeof file.secure_url === 'string' && file.secure_url.trim()) {
        return file.secure_url;
      }

      if (typeof file.url === 'string' && file.url.trim()) {
        return file.url;
      }

      if (typeof file.path === 'string') {
        if (/^https?:\/\//i.test(file.path)) {
          return file.path;
        }

        const normalizedPath = file.path.replace(/\\/g, '/');
        if (normalizedPath.startsWith('/uploads/')) {
          return normalizedPath;
        }

        if (normalizedPath.startsWith('uploads/')) {
          return `/${normalizedPath}`;
        }

        const fileName = path.basename(normalizedPath);
        if (fileName && fileName !== normalizedPath) {
          return `/uploads/products/${fileName}`;
        }
      }

      if (file.filename) {
        return `/uploads/products/${file.filename}`;
      }

      return '';
    })
    .filter(Boolean);
