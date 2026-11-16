import { Orders } from "../modules/orderSchema.js";
import { CACHE_NAMESPACES, invalidateCacheNamespaces } from "./responseCache.js";
import { PaymentAttempt } from "../modules/paymentAttemptSchema.js";
import { sendOrderConfirmationEmail } from "./orderEmail.js";
import { requestPaystackRefund } from './paystackRefunds.js';
import { expireOnlineOrder } from './orderExpiryWorker.js';

// Paystack transaction status -> order paymentStatus
export const STATUS_MAP = {
  success: "PAID",
  failed: "FAILED",
  abandoned: "ABANDONED",
  reversed: "REVERSED",
  ongoing: "PENDING",
  pending: "PENDING",
  processing: "PENDING",
  queued: "PENDING",
};

const CURRENCY = "GHS";

// Paystack's hosted checkout reports the selected payment channel and may
// include the network in authorization.bank/brand. Keep it separate from the
// gateway name (Paystack) and gracefully leave it empty if Paystack omits it.
const getServiceProvider = (payment) => {
  if (String(payment.channel || "").toLowerCase() !== "mobile_money") return undefined;

  const value = [payment.mobile_money?.provider, payment.authorization?.bank, payment.authorization?.brand]
    .find((candidate) => typeof candidate === "string" && candidate.trim());
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized === "mtn" || normalized.includes("mtn")) return "MTN";
  if (["atl", "airtel", "airtel money", "atmoney"].includes(normalized) || normalized.includes("airtel")) return "Airtel Money";
  if (normalized === "vod" || normalized.includes("telecel")) return "Telecel";
  if (normalized.includes("mpesa") || normalized.includes("m-pesa")) return "M-PESA";
  return value.trim();
};

// Calls Paystack's verify endpoint
export const fetchPaystackTransaction = async (reference) => {
  const response = await fetch(
    `${String(process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co').replace(/\/+$/, '')}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      signal: AbortSignal.timeout(10_000),
    }
  );

  const body = await response.json();

  if (!response.ok || !body.status) {
    return {
      ok: false,
      httpStatus: response.ok ? 400 : response.status,
      message: body.message || "Payment verification failed.",
    };
  }

  return { ok: true, payment: body.data || {} };
};

// Applies a verified Paystack transaction to an order.
// Safe to call many times (verify endpoint + webhook).
export const applyPaystackPayment = async (order, payment, reference) => {
  if (!payment || String(payment.reference || '') !== String(reference || '')) {
    return {
      ok: false,
      reason: "REFERENCE_MISMATCH",
      message: "Verified payment reference does not match the order payment reference.",
    };
  }

  const attempt = await PaymentAttempt.findOne({ reference });
  const orderReference = String(order.paymentDetails?.reference || '');
  if (attempt && String(attempt.order) !== String(order._id)) {
    return { ok: false, reason: 'ORDER_REFERENCE_MISMATCH', message: 'Payment reference does not belong to this order.' };
  }
  if (!attempt && orderReference !== String(reference)) {
    return { ok: false, reason: 'ORDER_REFERENCE_MISMATCH', message: 'Payment reference is not associated with this order.' };
  }

  const serviceProvider = getServiceProvider(payment);
  const paystackStatus = String(payment.status || "").toLowerCase();
  const paymentStatus = STATUS_MAP[paystackStatus] || "PENDING";
  const attemptStatus = {
    PAID: "SUCCESSFUL",
    FAILED: "FAILED",
    ABANDONED: "ABANDONED",
    REVERSED: "REFUNDED",
    PENDING: "PENDING",
  }[paymentStatus];

  const saveAttempt = (status) => PaymentAttempt.findOneAndUpdate(
    { reference: payment.reference || reference },
    {
      $set: {
        order: order._id,
        user: order.user?._id || order.user,
        amount: Number.isFinite(Number(payment.amount)) ? Math.round(Number(payment.amount) / 100) : order.totalPrice,
        verifiedAmountSubunits: Number.isSafeInteger(Number(payment.amount)) ? Number(payment.amount) : undefined,
        verifiedCurrency: typeof payment.currency === 'string' ? payment.currency.toUpperCase() : undefined,
        // Keep the schema's supported order currency while preserving the exact
        // provider currency separately for mismatch reconciliation/refunds.
        currency: CURRENCY,
        paymentMethod: payment.channel || "Paystack",
        serviceProvider,
        provider: "Paystack",
        transactionId: payment.id == null ? undefined : String(payment.id),
        status,
        gatewayStatus: paystackStatus,
        gatewayResponse: payment.gateway_response || payment.message,
        metadata: {
          channel: payment.channel,
          serviceProvider,
          paidAt: payment.paid_at,
          createdAt: payment.created_at,
        },
        ...(status === "PENDING" ? {} : { completedAt: payment.paid_at || payment.created_at || new Date() }),
      },
      $setOnInsert: { reference: payment.reference || reference },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  // 1. On success, the amount and currency must match the order
  if (paymentStatus === "PAID") {
    const paidPesewas = Number(payment.amount);
    const expectedPesewas = Math.round(Number(order.totalPrice) * 100);

    if (paidPesewas !== expectedPesewas || payment.currency !== CURRENCY) {
      const mismatchAttempt = await saveAttempt("SUCCESSFUL");
      await PaymentAttempt.updateOne(
        { reference: payment.reference || reference },
        { $set: { gatewayResponse: "Paid amount or currency does not match the order total." } }
      );
      if (mismatchAttempt?.transactionId && Number.isSafeInteger(paidPesewas) && paidPesewas > 0 && /^[A-Z]{3}$/.test(String(payment.currency || ''))) {
        await requestPaystackRefund({ order, paymentAttempt: mismatchAttempt, amountSubunits: paidPesewas, currency: payment.currency, reason: 'PAYMENT_MISMATCH' }, { processNow: false });
      }
      return {
        ok: false,
        reason: "AMOUNT_MISMATCH",
        message: "Paid amount does not match the order total.",
        paystackStatus,
        paymentStatus,
      };
    }
  }

  const savedAttempt = await saveAttempt(attemptStatus);

  // A Paystack checkout may finish after an admin has permanently cancelled
  // the order. Record the verified gateway attempt, but never mark that order paid.
  const isExpired = order.status === 'EXPIRED'
    || (order.status === 'PENDING' && order.paymentMethod === 'ONLINE' && order.expiresAt && order.expiresAt <= new Date());
  if ((order.status === "CANCELLED" || isExpired) && paymentStatus === 'PAID') {
    if (isExpired && order.status === 'PENDING') await expireOnlineOrder(order._id);
    const reason = order.status === 'CANCELLED' ? 'CANCELLED_ORDER' : 'EXPIRED_ORDER';
    if (savedAttempt?.transactionId && Number.isSafeInteger(Number(payment.amount)) && Number(payment.amount) > 0 && /^[A-Z]{3}$/.test(String(payment.currency || ''))) {
      await requestPaystackRefund({ order, paymentAttempt: savedAttempt, amountSubunits: Number(payment.amount), currency: payment.currency, reason }, { processNow: false });
    }
    return {
      ok: false,
      reason: order.status === 'CANCELLED' ? "ORDER_CANCELLED" : 'ORDER_EXPIRED',
      message: `This order has been ${order.status === 'CANCELLED' ? 'cancelled' : 'expired'}; the verified late payment has been recorded for reconciliation.`,
      paystackStatus,
      paymentStatus,
    };
  }

  // 2. Idempotency: never overwrite a PAID order (except for a reversal)
  if (order.paymentStatus === "PAID" && paymentStatus !== "REVERSED") {
    if (paymentStatus === 'PAID' && savedAttempt?.transactionId && String(order.paymentDetails?.reference || '') !== String(reference)) {
      await requestPaystackRefund({ order, paymentAttempt: savedAttempt, amountSubunits: Number(payment.amount), currency: payment.currency, reason: 'DUPLICATE_CHARGE' }, { processNow: false });
    }
    return {
      ok: true,
      skipped: true,
      order,
      paystackStatus,
      paymentStatus: "PAID",
    };
  }

  // 3. Build the update
  const update = {
    paymentStatus,
    "paymentDetails.provider": "Paystack",
    "paymentDetails.reference": payment.reference || reference,
    "paymentDetails.transactionId": payment.id?.toString(),
    "paymentDetails.amount": payment.amount ? payment.amount / 100 : undefined,
    "paymentDetails.currency": payment.currency,
    "paymentDetails.channel": payment.channel,
    "paymentDetails.serviceProvider": serviceProvider,
    "paymentDetails.gatewayResponse": payment.gateway_response,
    "paymentDetails.paystackStatus": paystackStatus,
  };

  if (paymentStatus === "PAID") {
    update["paymentDetails.paidAt"] = payment.paid_at || payment.created_at;

    // Move fulfilment forward only if the order is still in its initial state
    if (["PENDING", "PROCESSING"].includes(order.status)) {
      update.status = "CONFIRMED";
    }
  }

  // Remove undefined values so they don't overwrite existing data
  Object.keys(update).forEach((key) => {
    if (update[key] === undefined) delete update[key];
  });

  // 4. Atomic write: guards against verify + webhook racing each other
  const filter =
    paymentStatus === "REVERSED"
      ? { _id: order._id }
      : {
        _id: order._id,
        paymentStatus: { $ne: "PAID" },
        status: { $nin: ["CANCELLED", "EXPIRED"] },
        $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: { $exists: false } }],
      };

  const updatedOrder = await Orders.findOneAndUpdate(
    filter,
    { $set: update },
    { new: true, runValidators: true }
  );

  // Another request already marked it PAID between our read and write
  if (!updatedOrder) {
    const latest = await Orders.findById(order._id);
    if (latest?.paymentStatus === 'PAID' && paymentStatus === 'PAID'
      && String(latest.paymentDetails?.reference || '') !== String(reference)
      && savedAttempt?.transactionId && Number.isSafeInteger(Number(payment.amount)) && Number(payment.amount) > 0
      && /^[A-Z]{3}$/.test(String(payment.currency || ''))) {
      await requestPaystackRefund({
        order: latest,
        paymentAttempt: savedAttempt,
        amountSubunits: Number(payment.amount),
        currency: payment.currency,
        reason: 'DUPLICATE_CHARGE',
      }, { processNow: false });
    }
    if ((latest?.status === "CANCELLED" || latest?.status === 'EXPIRED' || (latest?.expiresAt && latest.expiresAt <= new Date())) && latest.paymentStatus !== "PAID" && paymentStatus === 'PAID') {
      if (latest.status === 'PENDING' && latest.paymentMethod === 'ONLINE') await expireOnlineOrder(latest._id);
      if (savedAttempt?.transactionId && Number.isSafeInteger(Number(payment.amount)) && Number(payment.amount) > 0 && /^[A-Z]{3}$/.test(String(payment.currency || ''))) {
        await requestPaystackRefund({ order: latest, paymentAttempt: savedAttempt, amountSubunits: Number(payment.amount), currency: payment.currency, reason: latest.status === 'CANCELLED' ? 'CANCELLED_ORDER' : 'EXPIRED_ORDER' }, { processNow: false });
      }
      return {
        ok: false,
        reason: latest.status === 'CANCELLED' ? "ORDER_CANCELLED" : 'ORDER_EXPIRED',
        message: "This order was cancelled or expired before its payment could be applied; the payment was recorded for reconciliation.",
        order: latest,
        paystackStatus,
        paymentStatus: latest.paymentStatus,
      };
    }
    return {
      ok: true,
      skipped: true,
      order: latest,
      paystackStatus,
      paymentStatus: latest?.paymentStatus || paymentStatus,
    };
  }

  await invalidateCacheNamespaces(CACHE_NAMESPACES.adminOrders, CACHE_NAMESPACES.userOrders);

  // 5. Send the confirmation email exactly once: only the request that
  //    actually flipped the order to PAID gets here.
  if (paymentStatus === "PAID") {
    sendOrderConfirmationEmail(updatedOrder._id).catch((err) =>
      console.error("Order confirmation email failed to send:", err)
    );
  }

  return {
    ok: true,
    skipped: false,
    order: updatedOrder,
    paystackStatus,
    paymentStatus,
  };
};
