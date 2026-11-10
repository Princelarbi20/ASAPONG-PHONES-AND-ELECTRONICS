const statusEmailTemplates = {
  PENDING: {
    subject: "Your order is pending review",
    message: "Your order has been received and is waiting to be reviewed by our team.",
  },
  CONFIRMED: {
    subject: "Your order has been confirmed",
    message: "Great news! Your order has been confirmed and will now move into preparation.",
  },
  PROCESSING: {
    subject: "Your order is being processed",
    message: "Your order is currently being prepared by our team.",
  },
  PACKED: {
    subject: "Your order has been packed",
    message: "Your order has been packed and is ready for dispatch.",
  },
  SHIPPED: {
    subject: "Your order has been shipped",
    message: "Your order is on its way. We will keep you updated as it moves through delivery.",
  },
  OUT_FOR_DELIVERY: {
    subject: "Your order is out for delivery",
    message: "Your order is out for delivery and should arrive soon.",
  },
  DELIVERED: {
    subject: "Your order has been delivered",
    message: "Your order has been delivered. We hope you enjoy your purchase.",
  },
  CANCELLED: {
    subject: "Your order has been cancelled",
    message: "Your order has been cancelled. Please contact our support team if you have any questions.",
  },
  RETURN_REQUESTED: {
    subject: "Your return request has been received",
    message: "We have received your return request and our team will review it shortly.",
  },
  RETURNED: {
    subject: "Your order has been returned",
    message: "Your order has been marked as returned. Please contact our support team if you have any questions.",
  },
  REFUNDED: {
    subject: "Your order has been refunded",
    message: "Your refund has been processed. Please allow your payment provider time to reflect it in your account.",
  },
};

export const ORDER_STATUSES = Object.freeze(Object.keys(statusEmailTemplates));

const normalizeStatus = (status) => String(status ?? "")
  .trim()
  .toUpperCase()
  .replace(/[\s-]+/g, "_");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const formatMoney = (value) => `$${Math.round(Number(value) || 0).toLocaleString("en-US")}`;

const getItemImage = (item) => item.image || item.productId?.images?.[0] || "";

export const buildOrderStatusEmail = ({ order, previousStatus, newStatus }) => {
  const normalizedStatus = normalizeStatus(newStatus);
  const normalizedPreviousStatus = normalizeStatus(previousStatus);
  const template = statusEmailTemplates[normalizedStatus];
  if (!template) {
    throw new Error(`Unsupported order status: ${newStatus}`);
  }

  const customerName = order.user?.userName || "Valued Customer";
  const orderId = order._id.toString();
  const items = order.items || [];
  const itemRows = items.map((item) => {
    const productName = item.name || item.productId?.name || "Product";
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const imageUrl = getItemImage(item);
    const imageCell = imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(productName)}" width="56" height="56" style="display:block; width:56px; height:56px; object-fit:cover; border-radius:6px;" />`
      : "";

    return `
      <tr>
        <td style="padding:12px 8px; border-bottom:1px solid #e5e7eb;">${imageCell}</td>
        <td style="padding:12px 8px; border-bottom:1px solid #e5e7eb;">${escapeHtml(productName)}</td>
        <td style="padding:12px 8px; border-bottom:1px solid #e5e7eb; text-align:center;">${quantity}</td>
        <td style="padding:12px 8px; border-bottom:1px solid #e5e7eb; text-align:right;">${formatMoney(price * quantity)}</td>
      </tr>`;
  }).join("");

  const textItems = items.map((item) => {
    const productName = item.name || item.productId?.name || "Product";
    const quantity = Number(item.quantity || 0);
    return `- ${productName} x ${quantity} (${formatMoney(Number(item.price || 0) * quantity)})`;
  }).join("\n");

  const text = [
    `Hello ${customerName},`,
    "",
    template.message,
    "",
    `Order ID: ${orderId}`,
    `Previous status: ${previousStatus}`,
    `New status: ${newStatus}`,
    `Payment status: ${order.paymentStatus || "PENDING"}`,
    "",
    "Order items:",
    textItems || "- No items listed",
    "",
    `Order total: ${formatMoney(order.totalPrice)}`,
    "",
    "Thank you for shopping with us.",
  ].join("\n");

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(template.subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 40px 10px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e5e7eb;">

            <tr>
              <td align="center" style="background-color: transparent; padding: 24px 24px 12px 24px;">
                <img src="${escapeHtml(process.env.CLOUDINARY_LOG || "")}" alt="Asapong Logo" style="max-height: 55px; width: auto; display: block; border: 0;" />
              </td>
            </tr>

            <tr>
              <td style="padding: 32px 28px; text-align: center;">
                <h2 style="color: #111827; margin: 0 0 12px 0; font-size: 20px; font-weight: 600;">
                  Hello, ${escapeHtml(customerName)}!
                </h2>
                <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 14px; line-height: 1.5;">
                  ${escapeHtml(template.message)}
                </p>

                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 18px; margin-bottom: 24px; border: 1px dashed #d1d5db;">
                  <span style="font-size: 18px; font-weight: 700; color: #4f46e5;">
                    ${escapeHtml(template.subject)}
                  </span>
                  <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0 0;">
                    Order ID: <strong style="color: #111827;">${escapeHtml(orderId)}</strong>
                  </p>
                </div>

                <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
                  Previous status: <strong style="color: #111827;">${escapeHtml(normalizedPreviousStatus.replace(/_/g, " "))}</strong><br />
                  New status: <strong style="color: #4f46e5;">${escapeHtml(normalizedStatus.replace(/_/g, " "))}</strong><br />
                  Payment status: <strong style="color: #111827;">${escapeHtml(order.paymentStatus || "PENDING")}</strong>
                </p>

                <p style="color: #111827; font-size: 14px; font-weight: 600; margin: 24px 0 8px 0; text-align: left;">
                  Order summary
                </p>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #4b5563; font-size: 12px; text-align: left;">
                  <thead>
                    <tr style="background-color: #f9fafb; color: #6b7280;">
                      <th style="padding: 8px 6px; font-weight: 600;">Image</th>
                      <th style="padding: 8px 6px; font-weight: 600;">Product</th>
                      <th style="padding: 8px 6px; font-weight: 600; text-align: center;">Qty</th>
                      <th style="padding: 8px 6px; font-weight: 600; text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows || "<tr><td colspan=\"4\" style=\"padding:12px 6px; text-align:center;\">No items listed</td></tr>"}</tbody>
                </table>
                <p style="color: #111827; font-size: 14px; margin: 16px 0 0 0; text-align: right;">
                  <strong>Total: ${formatMoney(order.totalPrice)}</strong>
                </p>
              </td>
            </tr>

            <tr>
              <td style="background-color: #f9fafb; padding: 16px 28px; text-align: center; border-top: 1px solid #f3f4f6;">
                <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                  &copy; ${new Date().getFullYear()} Asapong Inc. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

  return {
    subject: template.subject,
    text,
    html,
  };
};
