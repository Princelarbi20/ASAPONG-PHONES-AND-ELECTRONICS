import { Orders } from "../../modules/orderSchema.js";
import { buildOrderStatusEmail } from "../../utils/orderStatusEmail.js";
import sendEmail from "../../utils/nodemailer.js";
import { canTransitionOrderStatus } from "../../utils/orderStatusTransitions.js";

export const updateOrderStatusController =
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = Orders.schema.path("status").enumValues;
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid order status." });
      }

      const order = await Orders.findById(id)
        .populate("user", "userName email")
        .populate("items.productId", "name images");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const previousStatus = order.status;
      if (!canTransitionOrderStatus(previousStatus, status)) {
        return res.status(409).json({ success: false, message: `Order cannot move from ${previousStatus} to ${status}.` });
      }
      order.status = status;

      await order.save();

      let emailSent = null;
      if (previousStatus !== status) {
        try {
          if (!order.user?.email) throw new Error("The order customer does not have an email address.");
          const email = buildOrderStatusEmail({
            order,
            previousStatus,
            newStatus: status,
          });

          const result = await sendEmail({
            to: order.user.email,
            ...email,
          });
          emailSent = Boolean(result?.success);
          if (!emailSent) {
            console.error("Order status notification was not delivered:", result?.error || "Unknown mailer error");
          }
        } catch (emailError) {
          console.error("Failed to send order status email:", emailError);
          emailSent = false;
        }
      }

      res.status(200).json({
        success: true,
        message: emailSent === false
          ? "Order status updated, but the customer notification email could not be sent."
          : "Order status updated",
        emailSent,
        order,
      });
    } catch (err) {
      next(err);
    }
  };
