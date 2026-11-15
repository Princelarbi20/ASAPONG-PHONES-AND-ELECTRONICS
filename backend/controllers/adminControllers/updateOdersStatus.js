import { Orders } from "../../modules/orderSchema.js";
import { buildOrderStatusEmail } from "../../utils/orderStatusEmail.js";
import sendEmail from "../../utils/nodemailer.js";

export const updateOrderStatusController =
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

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
      order.status = status;

      await order.save();

      if (previousStatus !== status && order.user?.email) {
        try {
          const email = buildOrderStatusEmail({
            order,
            previousStatus,
            newStatus: status,
          });

          await sendEmail({
            to: order.user.email,
            ...email,
          });
        } catch (emailError) {
          console.error("Failed to send order status email:", emailError);
        }
      }

      res.status(200).json({
        success: true,
        message: "Order status updated",
        order,
      });
    } catch (err) {
      next(err);
    }
  };