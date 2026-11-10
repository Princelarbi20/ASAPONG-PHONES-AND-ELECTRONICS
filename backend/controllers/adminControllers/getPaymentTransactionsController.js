import mongoose from "mongoose";
import { PaymentAttempt } from "../../modules/paymentAttemptSchema.js";
import { Register } from "../../modules/userRegister.js";
import { Orders } from "../../modules/orderSchema.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getPaymentTransactionsController = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const { search = "", status = "", method = "" } = req.query;
    const filter = {};

    if (status) {
      const normalizedStatus = String(status).toUpperCase();
      if (!["PENDING", "SUCCESSFUL", "FAILED", "REFUNDED", "ABANDONED"].includes(normalizedStatus)) {
        return res.status(400).json({ success: false, message: "Invalid transaction status filter." });
      }
      filter.status = normalizedStatus;
    }

    if (method) filter.paymentMethod = new RegExp(`^${escapeRegex(String(method))}$`, "i");

    const term = String(search).trim().slice(0, 100);
    if (term) {
      const regex = new RegExp(escapeRegex(term), "i");
      const orderClauses = [
        ...(mongoose.isValidObjectId(term) ? [{ _id: term }] : []),
        ...( /^\d+$/.test(term) ? [{ orderNumber: Number(term) }] : []),
      ];
      const [customers, matchingOrders] = await Promise.all([
        Register.find({ userName: regex }).select("_id").lean(),
        orderClauses.length ? Orders.find({ $or: orderClauses }).select("_id").lean() : Promise.resolve([]),
      ]);

      const searchClauses = [
        { reference: regex },
        { transactionId: regex },
        { gatewayStatus: regex },
      ];
      if (customers.length) searchClauses.push({ user: { $in: customers.map(({ _id }) => _id) } });
      if (matchingOrders.length) searchClauses.push({ order: { $in: matchingOrders.map(({ _id }) => _id) } });
      filter.$or = searchClauses;
    }

    const [transactions, total, methods] = await Promise.all([
      PaymentAttempt.find(filter)
        .populate("user", "userName email")
        .populate("order", "orderNumber totalPrice paymentStatus")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PaymentAttempt.countDocuments(filter),
      PaymentAttempt.distinct("paymentMethod"),
    ]);

    return res.status(200).json({
      success: true,
      transactions,
      methods: methods.filter(Boolean).sort((left, right) => String(left).localeCompare(String(right))),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin payment transactions error:", error);
    return res.status(500).json({ success: false, message: "Unable to load payment transactions." });
  }
};
