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
        { customerName: regex },
        { customerEmail: regex },
      ];
      if (customers.length) searchClauses.push({ user: { $in: customers.map(({ _id }) => _id) } });
      if (matchingOrders.length) searchClauses.push({ order: { $in: matchingOrders.map(({ _id }) => _id) } });
      filter.$or = searchClauses;
    }

    let [transactions, total, methods] = await Promise.all([
      PaymentAttempt.find(filter)
        .populate("user", "userName email")
        .populate({
          path: "order",
          select: "orderNumber totalPrice paymentStatus user customerName customerEmail",
          populate: { path: "user", select: "userName email" },
        })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PaymentAttempt.countDocuments(filter),
      PaymentAttempt.distinct("paymentMethod"),
    ]);

    const unresolvedTransactions = transactions.filter((transaction) => !transaction.user?.userName && transaction.customerType !== "GUEST");
    const customerIds = [...new Set(unresolvedTransactions
      .map((transaction) => transaction.user?._id || transaction.user?.id || transaction.userId || transaction.user || transaction.order?.user?._id || transaction.order?.user)
      .filter((id) => mongoose.isValidObjectId(id))
      .map(String))];
    const customerEmails = [...new Set(unresolvedTransactions
      .map((transaction) => transaction.customerEmail || transaction.user?.email || transaction.order?.customerEmail || transaction.order?.user?.email)
      .filter((email) => typeof email === 'string' && email.includes('@'))
      .map((email) => email.trim().toLowerCase()))];
    if (customerIds.length || customerEmails.length) {
      const lookup = [];
      if (customerIds.length) lookup.push({ _id: { $in: customerIds } });
      if (customerEmails.length) lookup.push({ email: { $in: customerEmails } });
      const customers = await Register.find({ $or: lookup }).select("userName email").lean();
      const customersById = new Map(customers.map((customer) => [String(customer._id), customer]));
      const customersByEmail = new Map(customers.map((customer) => [String(customer.email || '').toLowerCase(), customer]));
      transactions = transactions.map((transaction) => {
        const customerId = transaction.user?._id || transaction.user?.id || transaction.userId || transaction.user || transaction.order?.user?._id || transaction.order?.user;
        const customerEmail = transaction.customerEmail || transaction.user?.email || transaction.order?.customerEmail || transaction.order?.user?.email;
        const customer = customersById.get(String(customerId)) || customersByEmail.get(String(customerEmail || '').trim().toLowerCase());
        const orderCustomer = transaction.order?.user;
        if (!customer && !orderCustomer?.userName) return transaction;
        const resolvedCustomer = customer || orderCustomer;
        transaction.user = typeof transaction.user === "object" && transaction.user !== null
          ? { ...resolvedCustomer, ...transaction.user, userName: transaction.user.userName || resolvedCustomer.userName }
          : resolvedCustomer;
        return transaction;
      });
    }
    transactions = transactions.map((transaction) => {
      if (transaction.customerType === "GUEST" && !transaction.user) {
        transaction.customerName ||= "Guest";
      } else if (!transaction.customerName && transaction.user?.userName) {
        transaction.customerName = transaction.user.userName;
      }
      return transaction;
    });

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
