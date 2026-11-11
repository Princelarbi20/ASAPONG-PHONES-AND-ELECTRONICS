import crypto from "crypto";
import { Orders } from "../../modules/orderSchema.js";
import {
  fetchPaystackTransaction,
  applyPaystackPayment,
} from "../../utils/paystack.js";

const HANDLED_EVENTS = ["charge.success", "charge.failed"];

export const paystackWebhookController = async (req, res) => {
  try {
    // req.body is a raw Buffer (see route setup below)
    const rawBody = req.body;
    const signature = req.headers["x-paystack-signature"];

    if (!Buffer.isBuffer(rawBody) || !signature) {
      return res.sendStatus(400);
    }

    // 1. Verify the signature
    const expected = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "utf8");
    const signatureBuf = Buffer.from(String(signature), "utf8");

    if (
      expectedBuf.length !== signatureBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, signatureBuf)
    ) {
      return res.sendStatus(401);
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ success: false, message: "Invalid webhook JSON." });
    }
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      return res.status(400).json({ success: false, message: "Invalid webhook payload." });
    }

    // 2. Acknowledge events we don't care about
    if (typeof event.event !== "string" || !HANDLED_EVENTS.includes(event.event)) {
      return res.sendStatus(200);
    }

    const reference = event.data?.reference;
    if (typeof reference !== "string" || !/^[A-Za-z0-9_-]{8,120}$/.test(reference)) {
      return res.status(400).json({ success: false, message: "Invalid payment reference." });
    }

    // 3. Find the order by reference, falling back to metadata.orderId
    let order = await Orders.findOne({ "paymentDetails.reference": reference });

    if (!order && event.data?.metadata?.orderId) {
      order = await Orders.findById(event.data.metadata.orderId);
    }

    if (!order) {
      console.warn(`Paystack webhook: no order found for reference ${reference}`);
      return res.sendStatus(200); // 200 so Paystack stops retrying
    }

    // 4. Re-verify with Paystack instead of trusting the payload alone
    const result = await fetchPaystackTransaction(reference);

    if (!result.ok) {
      console.error("Paystack webhook verify failed:", result.message);
      return res.sendStatus(500); // Paystack will retry
    }

    const applied = await applyPaystackPayment(order, result.payment, reference);

    if (!applied.ok) {
      console.error(
        `Paystack webhook: ${applied.reason} for order ${order._id}, reference ${reference}`
      );
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Paystack Webhook Error:", error);
    return res.sendStatus(500);
  }
};
