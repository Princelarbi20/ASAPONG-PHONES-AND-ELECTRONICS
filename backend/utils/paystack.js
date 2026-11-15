import { Orders } from "../modules/orderSchema.js";
import { sendOrderConfirmationEmail } from "./orderEmail.js";

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

// Calls Paystack's verify endpoint
export const fetchPaystackTransaction = async (reference) => {
  const response = await fetch(
    `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
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
  const paystackStatus = String(payment.status || "").toLowerCase();
  const paymentStatus = STATUS_MAP[paystackStatus] || "PENDING";

  // 1. On success, the amount and currency must match the order
  if (paymentStatus === "PAID") {
    const paidPesewas = Number(payment.amount);
    const expectedPesewas = Math.round(Number(order.totalPrice) * 100);

    if (paidPesewas !== expectedPesewas || payment.currency !== CURRENCY) {
      return {
        ok: false,
        reason: "AMOUNT_MISMATCH",
        message: "Paid amount does not match the order total.",
        paystackStatus,
        paymentStatus,
      };
    }
  }

  // 2. Idempotency: never overwrite a PAID order (except for a reversal)
  if (order.paymentStatus === "PAID" && paymentStatus !== "REVERSED") {
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
      : { _id: order._id, paymentStatus: { $ne: "PAID" } };

  const updatedOrder = await Orders.findOneAndUpdate(
    filter,
    { $set: update },
    { new: true, runValidators: true }
  );

  // Another request already marked it PAID between our read and write
  if (!updatedOrder) {
    const latest = await Orders.findById(order._id);
    return {
      ok: true,
      skipped: true,
      order: latest,
      paystackStatus,
      paymentStatus: latest?.paymentStatus || paymentStatus,
    };
  }

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