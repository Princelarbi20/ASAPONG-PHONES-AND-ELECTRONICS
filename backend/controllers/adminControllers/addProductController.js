import { Product } from "../../modules/productSchema.js";
import { normalizeUploadedImagePaths } from "../../utils/normalizeImagePaths.js";
import { getCloudinaryUploadMeta } from "../../utils/cloudinaryHelpers.js";
import { commitUploadedFiles } from "../../utils/uploadCleanup.js";

export const addProductController = async (req, res, next) => {
  try {
    const { id } = req.params; // Populates if updating via PUT route parameters
    const isUpdateMode = req.method === "PUT" || !!id;

    const {
      name,
      description,
      price,
      category,
      stock,
      brand,
      rating,
      shopId,
      specifications,
      newArrival,
    } = req.body;

    const numericPrice = Number(price);
    if (price === undefined || price === null || price === "" || !Number.isFinite(numericPrice) || !Number.isInteger(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ success: false, message: "Product price must be a whole number greater than or equal to zero." });
    }

    const imageUrl = normalizeUploadedImagePaths(req.files);
    const imagePublicIds = (req.files || [])
      .map((file) => getCloudinaryUploadMeta(file)?.public_id)
      .filter(Boolean);

    // Safe multi-part JSON form parser check
    let parsedSpecifications = [];
    if (specifications) {
      if (typeof specifications === "string") {
        try {
          parsedSpecifications = JSON.parse(specifications);
        } catch (parseErr) {
          return res.status(400).json({
            success: false,
            message: "Invalid format for specifications. Must be a valid JSON array.",
          });
        }
      } else if (Array.isArray(specifications)) {
        parsedSpecifications = specifications;
      }
    }

    // Safely parse boolean string payload from multipart/form-data
    const isNewArrival = newArrival === true || newArrival === "true";

    if (isUpdateMode) {
      // 1. UPDATE MODE LOGIC ENGINE (PUT)
      const updateData = {
        name,
        description,
        price: numericPrice,
        category,
        stock: parseInt(stock, 10) || 0,
        brand,
        rating: parseFloat(rating) || 1,
        specifications: parsedSpecifications,
        newArrival: isNewArrival,
      };

      // Prepare MongoDB update query object
      const updateQuery = { $set: updateData };

      // Append newly uploaded images to existing images array if uploaded
      if (imageUrl.length > 0) {
        updateQuery.$push = { images: { $each: imageUrl } };
      }
      if (imagePublicIds.length > 0) {
        updateQuery.$push = { ...updateQuery.$push, imagePublicIds: { $each: imagePublicIds } };
      }

      const updatedProduct = await Product.findByIdAndUpdate(id, updateQuery, {
        new: true,
        runValidators: true,
      });

      if (!updatedProduct) {
        return res.status(404).json({
          success: false,
          message: "Target product record not found",
        });
      }

      commitUploadedFiles(req);

      return res.status(200).json({
        success: true,
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } else {
      // 2. CREATE MODE LOGIC ENGINE (POST)
      const product = await Product.create({
        name,
        description,
        price: numericPrice,
        category,
        stock: parseInt(stock, 10) || 0,
        brand: brand || "Generic",
        rating: parseFloat(rating) || 1,
        images: imageUrl,
        imagePublicIds,
        shop: shopId || "STARTECH",
        status: "APPROVED",
        specifications: parsedSpecifications,
        newArrival: isNewArrival,
      });

      commitUploadedFiles(req);

      return res.status(201).json({
        success: true,
        message: "Product created and approved successfully",
        product,
      });
    }
  } catch (err) {
    next(err);
  }
};
