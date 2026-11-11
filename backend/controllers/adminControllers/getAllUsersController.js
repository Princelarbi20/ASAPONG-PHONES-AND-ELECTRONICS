import mongoose from "mongoose";
import { Register } from "../../modules/userRegister.js";
import { getPagination, paginationResult } from "../../utils/pagination.js";

const USER_ROLES = ["USER", "ADMIN", "DEALER"];
const SORT_FIELDS = { date: "createdAt", id: "_id", name: "userName", email: "email", role: "role", status: "isSuspended" };
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const parseDate = (value, name, res) => {
  if (value === undefined || value === "") return null;
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : null;
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    res.status(400).json({ success: false, message: `Invalid ${name}; use YYYY-MM-DD.` });
    return undefined;
  }
  return new Date(`${value}T${name === "dateTo" ? "23:59:59.999" : "00:00:00.000"}Z`);
};

export const getAllUsersController = async (req, res, next) => {
  try {
    for (const key of ["page", "limit"]) {
      if (req.query[key] !== undefined && (typeof req.query[key] !== "string" || !/^\d+$/.test(req.query[key]) || !Number.isSafeInteger(Number(req.query[key])) || Number(req.query[key]) < 1 || (key === "page" && Number(req.query[key]) > 10000000))) {
        return res.status(400).json({ success: false, message: `Invalid ${key} parameter.` });
      }
    }
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const { search = "", role = "", accountStatus = "", sortBy = "date", sortOrder = "desc", dateFrom, dateTo } = req.query;
    if (typeof search !== "string" || search.length > 100) return res.status(400).json({ success: false, message: "Search must be 100 characters or fewer." });
    if (role && !USER_ROLES.includes(String(role).toUpperCase())) return res.status(400).json({ success: false, message: "Invalid user role filter." });
    if (accountStatus && !["active", "inactive"].includes(String(accountStatus).toLowerCase())) return res.status(400).json({ success: false, message: "Invalid account status filter." });
    if (typeof sortBy !== "string" || !Object.hasOwn(SORT_FIELDS, sortBy) || !["asc", "desc"].includes(sortOrder)) return res.status(400).json({ success: false, message: "Invalid sort parameters." });

    const from = parseDate(dateFrom, "dateFrom", res);
    if (from === undefined) return;
    const to = parseDate(dateTo, "dateTo", res);
    if (to === undefined) return;
    if (from && to && from > to) return res.status(400).json({ success: false, message: "dateFrom must be on or before dateTo." });

    const filter = {};
    if (role) filter.role = String(role).toUpperCase();
    if (accountStatus) filter.isSuspended = String(accountStatus).toLowerCase() === "inactive";
    if (from || to) filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    const term = search.trim();
    if (term) {
      const regex = new RegExp(escapeRegex(term), "i");
      const searchOr = ["userName", "email", "phone"].map((field) => ({ [field]: regex }));
      if (mongoose.isValidObjectId(term)) searchOr.push({ _id: term });
      filter.$or = searchOr;
    }

    const sort = { [SORT_FIELDS[sortBy]]: sortOrder === "asc" ? 1 : -1, _id: sortOrder === "asc" ? 1 : -1 };
    const [users, totalUsers] = await Promise.all([
      Register.find(filter).select("-password -otp").sort(sort).skip(skip).limit(limit).lean(),
      Register.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, totalUsers, users, pagination: paginationResult(page, limit, totalUsers) });
  } catch (err) {
    next(err);
  }
};
