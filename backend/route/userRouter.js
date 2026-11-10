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

userRouter.get("/cart", verifyToken, refreshToken, getCartController);
userRouter.post("/add-to-cart", verifyToken, refreshToken, addToCartController);
userRouter.put("/update/:productId",verifyToken,refreshToken,updateCartQuantityController);
userRouter.delete("/remove/:productId",verifyToken,refreshToken,removeCartItemController);
userRouter.post("/create-order", verifyToken, refreshToken, createOrderController);
userRouter.get("/my-orders", verifyToken, refreshToken, getUserOrdersController);
userRouter.get("/get-All-product", getAllProducts)
userRouter.post("/create-shop",apiLimiter,certificate.array("files", 3),validatePdfs,createShopRequest);
userRouter.post("/dellaer-add-product",verifyToken,refreshToken,isDellaer,upload.array("images", 5),validateImages,addProductDealerController);
