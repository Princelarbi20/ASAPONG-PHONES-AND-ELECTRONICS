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
import { validatePaginationQuery, validateRequest, validateNoInputRequest, validators as v } from "../middleware/requestValidation.js";
export const adminRouter= express.Router()
// 5. Admin Routes
const OrdersStatus = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT FOR DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN REQUESTED', 'RETURNED', 'REFUNDED'];
const PaymentStatuses = ['PENDING', 'PAID', 'FAILED', 'ABANDONED', 'REVERSED'];
const paginationQueryFields = {
  page: (value) => typeof value === 'string' && /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 10_000_000,
  limit: (value) => typeof value === 'string' && /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 100,
};

adminRouter.get("/get-all-users",verifyToken,refreshToken,isAdmin,validatePaginationQuery,validateRequest({ query: { ...paginationQueryFields, search: (value) => typeof value === 'string' && value.length <= 100, role: (value) => value === '' || ['USER', 'ADMIN', 'DEALER'].includes(value), accountStatus: (value) => value === '' || ['active', 'inactive'].includes(value), sortBy: (value) => value === '' || ['date', 'id', 'name', 'email', 'role', 'status'].includes(value), sortOrder: (value) => value === '' || ['asc', 'desc'].includes(value), dateFrom: (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), dateTo: (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value) }, body: {} }),getAllUsersController);
adminRouter.get("/get-all-orders", verifyToken, refreshToken, isAdmin, validatePaginationQuery, validateRequest({ query: { ...paginationQueryFields, search: (value) => typeof value === 'string' && value.length <= 100, status: (value) => value === '' || OrdersStatus.includes(value), paymentStatus: (value) => value === '' || PaymentStatuses.includes(value), paymentMethod: (value) => typeof value === 'string' && value.length <= 50, sortBy: (value) => value === '' || ['date', 'id', 'amount', 'status', 'paymentStatus'].includes(value), sortOrder: (value) => value === '' || ['asc', 'desc'].includes(value), dateFrom: (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), dateTo: (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value) }, body: {} }), getAllOrdersController);
adminRouter.put("/update-orders/:id",verifyToken,refreshToken,isAdmin,validateRequest({ params: { "id*": v.objectId }, body: { "status*": v.orderStatus }, query: {} }),updateOrderStatusController);
const validateDashboardRange = validateRequest({ query: { days: (value) => ['7', '30', '90'].includes(value) }, body: {} });
adminRouter.get("/dashboard-charts",verifyToken,refreshToken,isAdmin,validateDashboardRange,getDashboardStatsController);
// Admin Product Management
const productBody = { "name*": v.shortText, "description*": v.longText, "price*": v.price, "category*": v.shortText, "stock*": v.stock, brand: v.shortText, rating: v.rating, shopId: (value) => typeof value === 'string' && value.length <= 100, specifications: v.specifications, newArrival: v.boolean };
const updateProductBody = { ...productBody, existingImages: (value) => typeof value === 'string' && value.length <= 10000 && (() => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) && parsed.length <= 16 && parsed.every((item) => typeof item === 'string' && item.length <= 2048); } catch { return false; } })() };
adminRouter.post("/products",verifyToken,refreshToken,isAdmin,upload.array("images", 16), validateImages, validateRequest({ body: productBody, query: {} }), addProductController);
adminRouter.put("/products-update/:id",verifyToken,refreshToken,isAdmin,upload.array("images", 6),validateImages,validateRequest({ params: { "id*": v.objectId }, body: updateProductBody, query: {} }),updateProductController);
adminRouter.delete("/products-delete/:id",verifyToken,refreshToken,isAdmin,validateRequest({ params: { "id*": v.objectId }, query: {}, body: {} }),deleteProductController);
adminRouter.get("/get-order/:id", verifyToken, refreshToken, isAdmin, validateRequest({ params: { "id*": v.objectId }, query: {}, body: {} }), getOrder);

// Admin User Status & Stats
adminRouter.put("/suspend-user/:id",verifyToken,refreshToken,isAdmin,validateRequest({ params: { "id*": v.objectId }, query: {}, body: {} }),suspendUserController);
adminRouter.put("/unsuspend-user/:id",verifyToken,refreshToken,isAdmin,validateRequest({ params: { "id*": v.objectId }, query: {}, body: {} }),unsuspendUserController);
adminRouter.get("/dashboard-stats",verifyToken,refreshToken,isAdmin,validateDashboardRange,getDashboardStatsController);
adminRouter.get("/transactions", verifyToken, refreshToken, isAdmin, validatePaginationQuery, validateRequest({ query: { ...paginationQueryFields, search: (value) => typeof value === 'string' && value.length <= 100, status: (value) => value === '' || ['PENDING', 'SUCCESSFUL', 'FAILED', 'REFUNDED', 'ABANDONED'].includes(value), method: (value) => value === '' || (typeof value === 'string' && value.length <= 50) }, body: {} }), getPaymentTransactionsController);

// Admin Shop & Management
adminRouter.get("/get-shop-request",verifyToken,refreshToken,isAdmin,validateNoInputRequest,getAllShopRequests);
adminRouter.put("/update-shop-status",verifyToken,refreshToken,isAdmin,validateRequest({ body: { "shopName*": v.shortText, "status*": (value) => ['PENDING', 'APPROVED', 'REJECTED'].includes(value) }, query: {} }),updateshopStatus);
adminRouter.get("/all-shops", verifyToken, refreshToken, isAdmin, validateNoInputRequest, allShops);
adminRouter.post("/add-new-admin", verifyToken, refreshToken, isAdmin, validateRequest({ body: { "userName*": v.name, "phone*": v.phone, "email*": v.email, "password*": v.password, role: (value) => ['ADMIN', 'USER'].includes(value) }, query: {} }), addnewAdmin);
adminRouter.post("/get-all-admin", verifyToken, refreshToken, isAdmin, validateRequest({ body: {}, query: {} }), getallAdmin);
