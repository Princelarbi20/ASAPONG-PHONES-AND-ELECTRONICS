import { Orders } from "../../modules/orderSchema.js";
import {
  fetchPaystackTransaction,
  applyPaystackPayment,
} from "../../utils/paystack.js";

export const verifyPaymentController = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required.",
      });
    }

    // Find the order by the reference saved at initialization
    const order = await Orders.findOne({ "paymentDetails.reference": reference });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "No order found for this payment reference.",
      });
    }

    // Optional ownership check (adjust to your auth middleware)
    if (req.user && order.user.toString() !== String(req.user.id || req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden.",
      });
    }

    const result = await fetchPaystackTransaction(reference);

    if (!result.ok) {
      return res.status(result.httpStatus).json({
        success: false,
        message: result.message,
      });
    }

    const payment = result.payment;
    const applied = await applyPaystackPayment(order, payment, reference);

    if (!applied.ok) {
      return res.status(400).json({
        success: false,
        message: applied.message,
      });
    }

    const succeeded = applied.paymentStatus === "PAID";

    return res.status(succeeded ? 200 : 400).json({
      success: succeeded,
      message: succeeded
        ? applied.skipped
          ? "Order already marked as paid."
          : "Payment verified successfully."
        : payment.gateway_response || `Payment ${applied.paystackStatus}.`,
      data: payment,
      order: applied.order.toObject(),
    });
  } catch (error) {
    console.error("Payment Verify Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};