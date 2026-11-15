
import { Product } from "../../modules/productSchema.js";
import { normalizeUploadedImagePaths } from "../../utils/normalizeImagePaths.js";
import { getCloudinaryUploadMeta } from "../../utils/cloudinaryHelpers.js";

export const updateProductController = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Destructure all fields out of req.body populated by Multer
    const { name, brand, category, description, price, stock, rating, newArrival, specifications, existingImages } = req.body;

    // 2. Validate that critical string properties arrived safely
    if (!brand) {
      return res.status(400).json({ success: false, message: "Brand field is missing in backend payload." });
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

    const updateData = {
      name,
      brand,
      category,
      description,
      price: parseFloat(price),
      stock: parseInt(stock, 10),
      rating: parseInt(rating, 10) || 1,
      images: finalImages,
      newArrival: newArrival === 'true',
      specifications: specs,
    };

    const updateQuery = { $set: updateData };
    if (finalImagePublicIds.length > 0) {
      updateQuery.$push = {
        imagePublicIds: { $each: finalImagePublicIds }
      };
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateQuery, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    res.status(200).json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error("Update error log:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
