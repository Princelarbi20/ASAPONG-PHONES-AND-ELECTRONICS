
import { Product } from "../../modules/productSchema.js";
import fs from "fs";
import path from "path";
import { destroyCloudinaryAsset, destroyCloudinaryAssetByPublicId, isCloudinaryUrl } from "../../utils/cloudinaryHelpers.js";

export const deleteProductController = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Find the target product to retrieve its image file references
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 2. Delete images from Cloudinary by explicit public IDs first
    if (Array.isArray(product.imagePublicIds) && product.imagePublicIds.length > 0) {
      for (const publicId of product.imagePublicIds) {
        try {
          const deleted = await destroyCloudinaryAssetByPublicId(publicId);
          console.log(`Cloudinary delete attempted for publicId=${publicId}:`, deleted);
        } catch (deleteErr) {
          console.error(`Failed to delete Cloudinary asset by publicId=${publicId}`, deleteErr);
        }
      }
    }

    // 3. Fallback: delete by URL if explicit public IDs were not available
    if (product.images && product.images.length > 0) {
      for (const imagePath of product.images) {
        if (isCloudinaryUrl(imagePath)) {
          try {
            const deleted = await destroyCloudinaryAsset(imagePath);
            console.log(`Cloudinary delete attempted on URL: ${imagePath}`);
            if (deleted) {
              console.log(`Cloudinary asset deleted by URL: ${imagePath}`);
            } else {
              console.warn(`Cloudinary asset was not deleted by URL: ${imagePath}`);
            }
          } catch (deleteErr) {
            console.error(`Failed to delete Cloudinary asset by URL: ${imagePath}`, deleteErr);
          }
        } else {
          const fullPath = path.resolve(imagePath);
          if (fs.existsSync(fullPath)) {
            fs.unlink(fullPath, (err) => {
              if (err) {
                console.error(`Failed to delete file: ${fullPath}`, err);
              } else {
                console.log(`Successfully purged asset: ${fullPath}`);
              }
            });
          }
        }
      }
    }

    // 3. Remove the document from MongoDB
    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Product and associated server files removed successfully.",
    });
  } catch (err) {
    next(err);
  }
};