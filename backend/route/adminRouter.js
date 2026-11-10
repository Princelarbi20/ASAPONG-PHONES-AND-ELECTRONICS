// Admin Controllers
import { getAllUsersController } from "../controllers/adminControllers/getAllUsersController.js";
import { getAllOrdersController } from "../controllers/adminControllers/getAllOrdersController.js";
import { updateOrderStatusController } from "../controllers/adminControllers/updateOdersStatus.js";
import { addProductController } from "../controllers/adminControllers/addProductController.js";
import { updateProductController } from "../controllers/adminControllers/updateProductController.js";
import { deleteProductController } from "../controllers/adminControllers/deleteProductController.js";
import { suspendUserController } from "../controllers/adminControllers/suspendUserController.js";
import { unsuspendUserController } from "../controllers/adminControllers/unsuspendUserController.js";
import { getAllProducts } from "../controllers/adminControllers/getAllProductsController.js";
import  getAllShopRequests from "../controllers/adminControllers/getAllShopRequests.js";
import { updateshopStatus } from "../controllers/adminControllers/updateshopStatus.js";
import { addnewAdmin } from "../controllers/adminControllers/addnewAdmin.js";
import { getallAdmin } from "../controllers/adminControllers/getallAdmin.js";
import { allShops } from "../controllers/adminControllers/getallShops.js";
import { getOrder } from "../controllers/adminControllers/getOrder.js";
import { getDashboardStatsController } from "../controllers/adminControllers/getDashboardChartsController.js";
import { getPaymentTransactionsController } from "../controllers/adminControllers/getPaymentTransactionsController.js";
import { verifyToken} from "../middleware/verifyToken.js";
import isAdmin from "../middleware/isAdmin.js";
import { refreshToken } from "../middleware/refreshToken.js";
import { upload } from "../middleware/upload.js";
import { validateImages } from "../middleware/validateUploadedFiles.js";
import express from "express"
export const adminRouter= express.Router()
// 5. Admin Routes

adminRouter.get("/get-all-users",verifyToken,refreshToken,isAdmin,getAllUsersController);
adminRouter.get("/get-all-orders", verifyToken, refreshToken, isAdmin, getAllOrdersController);
adminRouter.put("/update-orders/:id",verifyToken,refreshToken,isAdmin,updateOrderStatusController);
adminRouter.get("/dashboard-charts",verifyToken,refreshToken,isAdmin,getDashboardStatsController);
// Admin Product Management
adminRouter.post("/products",verifyToken,refreshToken,isAdmin,upload.array("images", 16), validateImages, addProductController);
adminRouter.put("/products-update/:id",verifyToken,refreshToken,isAdmin,upload.array("images", 6),validateImages,updateProductController);
adminRouter.delete("/products-delete/:id",verifyToken,refreshToken,isAdmin,deleteProductController);
adminRouter.get("/get-order/:id", verifyToken, refreshToken, isAdmin, getOrder);

// Admin User Status & Stats
adminRouter.put("/suspend-user/:id",verifyToken,refreshToken,isAdmin,suspendUserController);
adminRouter.put("/unsuspend-user/:id",verifyToken,refreshToken,isAdmin,unsuspendUserController);
adminRouter.get("/dashboard-stats",verifyToken,refreshToken,isAdmin,getDashboardStatsController);
adminRouter.get("/transactions", verifyToken, refreshToken, isAdmin, getPaymentTransactionsController);

// Admin Shop & Management
adminRouter.get("/get-shop-request",verifyToken,refreshToken,isAdmin,getAllShopRequests);
adminRouter.put("/update-shop-status",verifyToken,refreshToken,isAdmin,updateshopStatus);
adminRouter.get("/all-shops", verifyToken, refreshToken, isAdmin, allShops);
adminRouter.post("/add-new-admin", verifyToken, refreshToken, isAdmin, addnewAdmin);
adminRouter.post("/get-all-admin", verifyToken, refreshToken, isAdmin, getallAdmin);
