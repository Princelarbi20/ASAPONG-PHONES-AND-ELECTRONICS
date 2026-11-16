import { Orders } from '../../modules/orderSchema.js';
import { PaymentAttempt } from '../../modules/paymentAttemptSchema.js';
import { requestPaystackRefund } from '../../utils/paystackRefunds.js';

export const requestOrderRefundController = async (req, res, next) => {
  try {
    const order = await Orders.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.paymentStatus !== 'PAID' || ['CANCELLED', 'EXPIRED'].includes(order.status)) {
      return res.status(409).json({ success: false, message: 'Only an active paid order can be refunded.' });
    }

    const attempt = await PaymentAttempt.findOne({
      order: order._id,
      reference: order.paymentDetails?.reference,
      status: 'SUCCESSFUL',
    });
    if (!attempt?.transactionId) {
      return res.status(409).json({ success: false, message: 'A verified Paystack transaction is required before refunding.' });
    }

    const amountSubunits = Number(attempt.verifiedAmountSubunits ?? Math.round(attempt.amount * 100));
    const refund = await requestPaystackRefund({
      order,
      paymentAttempt: attempt,
      amountSubunits,
      currency: attempt.verifiedCurrency || attempt.currency,
      reason: 'ADMIN_REQUEST',
    }, { processNow: false });

    return res.status(202).json({
      success: true,
      message: 'Refund request recorded. The order remains paid until Paystack confirms the refund.',
      data: { reference: refund.reference, status: refund.status },
    });
  } catch (error) {
    return next(error);
  }
};
