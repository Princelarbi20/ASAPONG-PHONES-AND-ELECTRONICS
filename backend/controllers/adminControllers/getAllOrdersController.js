import mongoose from "mongoose";
import { Orders } from "../../modules/orderSchema.js";
import { Register } from "../../modules/userRegister.js";
import { getPagination, paginationResult } from "../../utils/pagination.js";

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT FOR DELIVERY", "DELIVERED", "CANCELLED", "RETURN REQUESTED", "RETURNED", "REFUNDED"];
const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "ABANDONED", "REVERSED"];
const SORT_FIELDS = { date: "createdAt", id: "_id", amount: "totalPrice", status: "status", paymentStatus: "paymentStatus" };
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const attachOrderUsers = async (orders) => {
  const unresolvedOrders = orders.filter((order) => !order.user?.userName && order.customerType !== "GUEST");
  const missingUserIds = [...new Set(unresolvedOrders
    .map((order) => order.user?._id || order.user?.id || order.userId || order.user)
    .filter((id) => mongoose.isValidObjectId(id))
    .map(String))];
  const customerEmails = [...new Set(unresolvedOrders
    .map((order) => order.customerEmail || order.user?.email || (typeof order.user === 'string' && order.user.includes('@') ? order.user : null))
    .filter((email) => typeof email === 'string' && email.includes('@'))
    .map((email) => email.trim().toLowerCase()))];
  if (!missingUserIds.length && !customerEmails.length) return orders;

  const lookup = [];
  if (missingUserIds.length) lookup.push({ _id: { $in: missingUserIds } });
  if (customerEmails.length) lookup.push({ email: { $in: customerEmails } });
  const users = await Register.find({ $or: lookup }).select("userName email phone").lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  const usersByEmail = new Map(users.map((user) => [String(user.email || '').toLowerCase(), user]));
  return orders.map((order) => {
    const userId = order.user?._id || order.user?.id || order.userId || order.user;
    const customerEmail = order.customerEmail || order.user?.email || (typeof order.user === 'string' && order.user.includes('@') ? order.user : null);
    const fetchedUser = usersById.get(String(userId)) || usersByEmail.get(String(customerEmail || '').trim().toLowerCase());
    if (!fetchedUser) return order;
    order.user = typeof order.user === "object" && order.user !== null
      ? { ...fetchedUser, ...order.user, userName: order.user.userName || fetchedUser.userName }
      : fetchedUser;
    return order;
  });
};
const parseDate = (value, name, res) => {
  if (value === undefined || value === "") return null;
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : null;
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    res.status(400).json({ success: false, message: `Invalid ${name}; use YYYY-MM-DD.` });
    return undefined;
  }
  return new Date(`${value}T${name === "dateTo" ? "23:59:59.999" : "00:00:00.000"}Z`);
};

export const getAllOrdersController = async (req, res, next) => {
  try {
    for (const key of ["page", "limit"]) {
      if (req.query[key] !== undefined && (typeof req.query[key] !== "string" || !/^\d+$/.test(req.query[key]) || !Number.isSafeInteger(Number(req.query[key])) || Number(req.query[key]) < 1 || (key === "page" && Number(req.query[key]) > 10000000))) {
        return res.status(400).json({ success: false, message: `Invalid ${key} parameter.` });
      }
    }
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const { search = "", status = "", paymentStatus = "", paymentMethod = "", sortBy = "date", sortOrder = "desc", dateFrom, dateTo } = req.query;
    if (typeof search !== "string" || search.length > 100) return res.status(400).json({ success: false, message: "Search must be 100 characters or fewer." });
    if (status && !ORDER_STATUSES.includes(String(status).toUpperCase())) return res.status(400).json({ success: false, message: "Invalid order status filter." });
    if (paymentStatus && !PAYMENT_STATUSES.includes(String(paymentStatus).toUpperCase())) return res.status(400).json({ success: false, message: "Invalid payment status filter." });
    if (typeof sortBy !== "string" || !Object.hasOwn(SORT_FIELDS, sortBy) || !["asc", "desc"].includes(sortOrder)) return res.status(400).json({ success: false, message: "Invalid sort parameters." });

    const from = parseDate(dateFrom, "dateFrom", res);
    if (from === undefined) return;
    const to = parseDate(dateTo, "dateTo", res);
    if (to === undefined) return;
    if (from && to && from > to) return res.status(400).json({ success: false, message: "dateFrom must be on or before dateTo." });

    const filter = {};
    if (status) filter.status = String(status).toUpperCase();
    if (paymentStatus) filter.paymentStatus = String(paymentStatus).toUpperCase();
    if (paymentMethod) {
      if (typeof paymentMethod !== "string" || paymentMethod.length > 50) return res.status(400).json({ success: false, message: "Invalid payment method filter." });
      filter.$and = [...(filter.$and || []), { $or: ["channel", "provider", "serviceProvider"].map((field) => ({ [`paymentDetails.${field}`]: new RegExp(`^${escapeRegex(paymentMethod)}$`, "i") })) }];
    }
    if (from || to) filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };

    const term = search.trim();
    let orders;
    let totalOrders;
    if (term) {
      const regex = new RegExp(escapeRegex(term), "i");
      const searchOr = [
        { "paymentDetails.reference": regex }, { "paymentDetails.transactionId": regex },
        { status: regex }, { paymentStatus: regex },
        { customerName: regex }, { customerEmail: regex },
      ];
      if (/^\d+$/.test(term)) searchOr.push({ orderNumber: Number(term) });
      if (mongoose.isValidObjectId(term)) searchOr.push({ _id: term });
      const sort = { [SORT_FIELDS[sortBy]]: sortOrder === "asc" ? 1 : -1, _id: sortOrder === "asc" ? 1 : -1 };
      const [result] = await Orders.aggregate([
        { $match: filter },
        { $lookup: { from: Register.collection.name, localField: "user", foreignField: "_id", as: "searchUser" } },
        { $unwind: { path: "$searchUser", preserveNullAndEmptyArrays: true } },
        { $match: { $or: [...searchOr, ...["userName", "email", "phone"].map((field) => ({ [`searchUser.${field}`]: regex }))] } },
        { $facet: {
          data: [
            { $sort: sort }, { $skip: skip }, { $limit: limit },
            { $set: { user: { _id: "$searchUser._id", userName: "$searchUser.userName", email: "$searchUser.email", phone: "$searchUser.phone" } } },
            { $unset: "searchUser" },
          ],
          total: [{ $count: "count" }],
        } },
      ]);
      orders = result?.data || [];
      totalOrders = result?.total?.[0]?.count || 0;
    } else {
      const sort = { [SORT_FIELDS[sortBy]]: sortOrder === "asc" ? 1 : -1, _id: sortOrder === "asc" ? 1 : -1 };
      [orders, totalOrders] = await Promise.all([
        Orders.find(filter).populate("user", "userName email phone").sort(sort).skip(skip).limit(limit).lean(),
        Orders.countDocuments(filter),
      ]);
    }

    orders = await attachOrderUsers(orders);
    orders = orders.map((order) => {
      if (order.customerType === "GUEST" && !order.user) order.customerName ||= "Guest";
      else if (!order.customerName && order.user?.userName) order.customerName = order.user.userName;
      return order;
    });

    const paymentMethods = await Orders.distinct("paymentDetails.channel");

    res.status(200).json({
      success: true,
      totalOrders,
      orders,
      paymentMethods: paymentMethods.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b))),
      pagination: paginationResult(page, limit, totalOrders),
    });
  } catch (err) {
    next(err);
  }
};
