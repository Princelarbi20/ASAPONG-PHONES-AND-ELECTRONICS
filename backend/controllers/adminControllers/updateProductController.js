
import { Product } from "../../modules/productSchema.js";
import { normalizeUploadedImagePaths } from "../../utils/normalizeImagePaths.js";
import { getCloudinaryUploadMeta } from "../../utils/cloudinaryHelpers.js";
import { destroyCloudinaryAssetByPublicId, getCloudinaryPublicId } from "../../utils/cloudinaryHelpers.js";
import { commitUploadedFiles } from "../../utils/uploadCleanup.js";

export const updateProductController = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Destructure all fields out of req.body populated by Multer
    const { name, brand, category, description, price, stock, rating, newArrival, specifications, existingImages } = req.body;

    // 2. Validate that critical string properties arrived safely
    if (!brand) {
      return res.status(400).json({ success: false, message: "Brand field is missing in backend payload." });
    }
    const numericPrice = Number(price);
    if (price === undefined || price === null || price === "" || !Number.isFinite(numericPrice) || !Number.isInteger(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ success: false, message: "Product price must be a whole number greater than or equal to zero." });
    }

    // 3. Handle image configuration logic
    let finalImages = [];
    let finalImagePublicIds = [];
    if (existingImages && typeof existingImages === 'string') {
      // Parse the JSON string array sent down by your frontend state
      finalImages = JSON.parse(existingImages);
    }

    // 4. If new image files were uploaded, add their paths and public IDs to the final arrays
    if (req.files && req.files.length > 0) {
      const newImagePaths = normalizeUploadedImagePaths(req.files);
      finalImages = [...finalImages, ...newImagePaths];
      finalImagePublicIds = req.files
        .map((file) => getCloudinaryUploadMeta(file)?.public_id)
        .filter(Boolean);
    }

    // 5. Safely parse specifications if they exist
    let specs = [];
    if (specifications && typeof specifications === 'string') {
      try {
        specs = JSON.parse(specifications);
      } catch (e) { /* Ignore parsing error if JSON is malformed */ }
    }

    // 5. Update the document against the database
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    const retainedPublicIds = (existingProduct.images || [])
      .filter((image) => finalImages.includes(image))
      .map((image) => getCloudinaryPublicId(image))
      .filter(Boolean);
    const oldPublicIds = Array.isArray(existingProduct.imagePublicIds) && existingProduct.imagePublicIds.length
      ? existingProduct.imagePublicIds
      : (existingProduct.images || []).map(getCloudinaryPublicId).filter(Boolean);
    const nextPublicIds = [...new Set([...retainedPublicIds, ...finalImagePublicIds])];
    const removedPublicIds = oldPublicIds.filter((publicId) => !nextPublicIds.includes(publicId));

    const updateData = {
      name,
      brand,
      category,
      description,
      price: numericPrice,
      stock: parseInt(stock, 10),
      rating: parseInt(rating, 10) || 1,
      images: finalImages,
      imagePublicIds: nextPublicIds,
      newArrival: newArrival === 'true',
      specifications: specs,
    };

    const updatedProduct = await Product.findByIdAndUpdate(id, { $set: updateData }, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    commitUploadedFiles(req);
    await Promise.all(removedPublicIds.map((publicId) => destroyCloudinaryAssetByPublicId(publicId).catch((error) => {
      console.error('Failed to remove replaced Cloudinary product image:', error);
    })));
    res.status(200).json({ success: true, product: updatedProduct });
  } catch (error) {
    next(error);
  }
};
