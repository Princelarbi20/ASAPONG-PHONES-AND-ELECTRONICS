import { v2 as cloudinary } from "cloudinary";

const cloudinaryConfigured = Boolean(
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

export const isCloudinaryUrl = (imagePath) =>
  typeof imagePath === 'string' && /^https?:\/\/([^/]+\.)?cloudinary\.com\//.test(imagePath);

export const getCloudinaryPublicId = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  try {
    const parsedUrl = new URL(imageUrl);
    const parts = parsedUrl.pathname.split('/').filter(Boolean);
    const uploadIndex = parts.findIndex((segment) => segment === 'upload');
    if (uploadIndex === -1) return null;

    const afterUpload = parts.slice(uploadIndex + 1);
    const versionRegex = /^v\d+$/;
    const versionIndex = afterUpload.findIndex((segment) => versionRegex.test(segment));
    const publicIdStart = versionIndex >= 0 ? versionIndex + 1 : 0;
    const rawPublicIdParts = afterUpload.slice(publicIdStart);
    if (!rawPublicIdParts.length) return null;

    const isTransformSegment = (segment) =>
      /[,=]/.test(segment) || /^[a-z]{1,3}_[^/]+$/i.test(segment);

    const publicIdParts = [...rawPublicIdParts];
    while (publicIdParts.length > 0 && isTransformSegment(publicIdParts[0])) {
      publicIdParts.shift();
    }

    if (!publicIdParts.length) return null;
    let publicId = publicIdParts.join('/');
    const extensionIndex = publicId.lastIndexOf('.');
    if (extensionIndex !== -1) {
      publicId = publicId.substring(0, extensionIndex);
    }

    return publicId;
  } catch {
    return null;
  }
};

export const getCloudinaryUploadMeta = (file) => {
  if (!file || typeof file !== 'object') return null;

  const url = (typeof file.secure_url === 'string' && file.secure_url.trim())
    ? file.secure_url
    : (typeof file.url === 'string' && file.url.trim())
      ? file.url
      : (typeof file.path === 'string' && file.path.trim())
        ? file.path
        : null;

  const public_id = typeof file.public_id === 'string' && file.public_id.trim()
    ? file.public_id
    : url
      ? getCloudinaryPublicId(url)
      : null;

  return { url, public_id };
};

export const destroyCloudinaryAssetByPublicId = async (publicId) => {
  if (!cloudinaryConfigured) {
    throw new Error('Cloudinary is not configured.');
  }

  if (!publicId || typeof publicId !== 'string') return false;

  const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  return result.result === 'ok' || result.result === 'not found';
};

export const destroyCloudinaryAsset = async (imageUrlOrPublicId) => {
  if (!cloudinaryConfigured) {
    throw new Error('Cloudinary is not configured.');
  }

  const publicId = imageUrlOrPublicId?.startsWith('http')
    ? getCloudinaryPublicId(imageUrlOrPublicId)
    : imageUrlOrPublicId;

  if (!publicId) return false;

  return destroyCloudinaryAssetByPublicId(publicId);
};
