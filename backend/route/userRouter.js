import express from "express"
export const userRouter = express.Router()
import { verifyToken } from "../middleware/verifyToken.js";
import { refreshToken } from "../middleware/refreshToken.js";
import { apiLimiter } from "../middleware/loginLimitation.js";
import isDellaer from "../middleware/isDellaer.js";

// User & Cart Controllers
import { addToCartController } from "../controllers/userController/addToCartController.js";
import { getCartController } from "../controllers/userController/catController.js";
import { updateCartQuantityController } from "../controllers/userController/updateCartQuantityController.js";
import { removeCartItemController } from "../controllers/userController/removeFromCartController.js";
import { createOrderController } from "../controllers/userController/createOrderController.js";
import { getUserOrdersController } from "../controllers/userController/getUserOrdersController.js";
import { addProductDealerController } from "../controllers/dellarController/dellaerAddProduct.js";
import { createShopRequest } from "../controllers/dellarController/createShopeController.js";
import { getAllProducts } from "../controllers/adminControllers/getAllProductsController.js";
import { certificate } from "../middleware/certificatStorage.js";
import { upload } from "../middleware/upload.js";
import { validatePdfs } from "../middleware/validateUploadedFiles.js";
import { validateImages } from "../middleware/validateUploadedFiles.js";
import { validatePaginationQuery, validateRequest, validators as v } from "../middleware/requestValidation.js";

userRouter.get("/cart", verifyToken, refreshToken, validateRequest({ query: {}, body: {} }), getCartController);
userRouter.post("/add-to-cart", verifyToken, refreshToken, validateRequest({ body: { "productId*": v.objectId, quantity: v.quantity }, query: {} }), addToCartController);
userRouter.put("/update/:productId",verifyToken,refreshToken,validateRequest({ params: { "productId*": v.objectId }, body: { "quantity*": v.cartQuantity }, query: {} }),updateCartQuantityController);
userRouter.delete("/remove/:productId",verifyToken,refreshToken,validateRequest({ params: { "productId*": v.objectId }, query: {}, body: {} }),removeCartItemController);
userRouter.post("/create-order", verifyToken, refreshToken, validateRequest({ body: { "shippingAddress*": v.address, paymentMethod: v.paymentMethod }, query: {} }), createOrderController);
userRouter.get("/my-orders", verifyToken, refreshToken, validateRequest({ query: { paymentStatus: (value) => typeof value === 'string' && ['PENDING', 'PAID', 'FAILED', 'ABANDONED', 'REVERSED'].includes(value.toUpperCase()) }, body: {} }), getUserOrdersController);
userRouter.get("/get-All-product", validatePaginationQuery, validateRequest({ query: { category: (value) => typeof value === 'string' && value.length <= 100, search: (value) => typeof value === 'string' && value.length <= 100, brandSort: (value) => ['asc', 'desc'].includes(value) }, body: {} }), getAllProducts)
userRouter.post("/create-shop",apiLimiter,certificate.array("files", 3),validatePdfs,validateRequest({ body: { "shopName*": v.shortText, "description*": v.longText, "category*": v.shortText, "email*": v.email, "number*": v.phone, "password*": v.password }, query: {} }),createShopRequest);
userRouter.post("/dellaer-add-product",verifyToken,refreshToken,isDellaer,upload.array("images", 5),validateImages,validateRequest({ body: { "name*": v.shortText, "description*": v.longText, "price*": v.price, "category*": v.shortText, "stock*": v.stock, "brand*": v.shortText, rating: v.rating }, query: {} }),addProductDealerController);
