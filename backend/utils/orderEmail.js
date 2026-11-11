import { Orders } from '../modules/orderSchema.js';
import sendEmail from './nodemailer.js';

const CURRENCY_SYMBOL = 'GH₵';

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const money = (n) => `${CURRENCY_SYMBOL}${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

const buildItemsHtml = (order, logo) =>
  order.items
    .map((item) => {
      const imageUrl = item.image || logo || 'https://via.placeholder.com/60?text=Product';
      return `
        <tr>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; width: 60px; vertical-align: middle;">
            <img src="${esc(imageUrl)}" alt="${esc(item.name)}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; display: block;" />
          </td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; vertical-align: middle;">
            <strong style="font-size: 14px; color: #111827;">${esc(item.name)}</strong><br />
            <span style="font-size: 12px; color: #6b7280;">Qty: ${item.quantity} &times; ${money(item.price)}</span>
          </td>
          <td align="right" style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600; vertical-align: middle; font-size: 14px;">
            ${money(item.price * item.quantity)}
          </td>
        </tr>
      `;
    })
    .join('');

export const buildCashOnDeliveryOrderEmail = (order) => {
  const customerName = esc(order.user?.userName || 'Valued Customer');
  const logo = process.env.CLOUDINARY_LOG || '';
  const addr = order.shippingAddress || {};
  const reference = order.orderNumber || order._id;
  const itemLines = (order.items || []).map((item) =>
    `- ${item.name || 'Product'} x ${Number(item.quantity) || 0}: ${money((Number(item.price) || 0) * (Number(item.quantity) || 0))}`
  ).join('\n');
  const body = `
    <h2 style="color: #111827; margin: 0 0 14px 0; font-size: 18px; font-weight: 700;">Hello ${customerName},</h2>
    <p style="color: #4b5563; margin: 0 0 12px 0; font-size: 14px; line-height: 1.6;">We received your order with Asapong. Your order is awaiting confirmation from our team.</p>
    <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
      <strong style="color: #9a3412;">Cash on Delivery</strong>
      <p style="color: #7c2d12; font-size: 13px; line-height: 1.5; margin: 6px 0 0;">Your order has not been paid for. Please pay ${money(order.totalPrice)} in cash when your order is delivered.</p>
    </div>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
      <span style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Order Reference</span><br />
      <span style="color: #4f46e5; font-size: 16px; font-weight: 700;">#${esc(reference)}</span>
    </div>
    <h3 style="color: #111827; margin: 0 0 10px 0; font-size: 15px; font-weight: 700;">Order Items</h3>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #e5e7eb; font-size: 14px; margin-bottom: 20px;">
      <tbody>
        ${buildItemsHtml(order, logo)}
        <tr style="background-color: #f9fafb;">
          <td colspan="2" style="padding: 12px; font-weight: 700; color: #111827;">Total due on delivery</td>
          <td align="right" style="padding: 12px; font-weight: 800; color: #4f46e5; font-size: 16px;">${money(order.totalPrice)}</td>
        </tr>
      </tbody>
    </table>
    <h3 style="color: #111827; margin: 0 0 8px 0; font-size: 15px; font-weight: 700;">Delivery Address</h3>
    <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 13px; line-height: 1.5; background-color: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
      ${esc(addr.address)}<br />${esc(addr.city)}, ${esc(addr.state)} ${esc(addr.postalCode)}<br />${esc(addr.country)}
    </p>
    <p style="color: #111827; font-size: 14px; margin: 0; font-weight: 600;">Best regards,<br /><span style="color: #4f46e5;">The Asapong Team</span></p>
  `;

  return {
    subject: `Order received — Cash on Delivery #${reference}`,
    html: layout({ logo, body }),
    text: [
      `Hello ${order.user?.userName || 'Valued Customer'},`,
      'We received your order with Asapong. It is awaiting confirmation from our team.',
      'Payment method: Cash on Delivery. This order has not been paid for.',
      `Amount due on delivery: ${money(order.totalPrice)}`,
      `Order reference: #${reference}`,
      'Items:', itemLines,
      `Delivery address: ${[addr.address, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean).join(', ')}`,
    ].filter(Boolean).join('\n'),
  };
};

export const sendCashOnDeliveryOrderEmail = async (orderId) => {
  const { order, recipientEmail } = await loadOrderForEmail(orderId);
  return sendEmail({ to: recipientEmail, ...buildCashOnDeliveryOrderEmail(order) });
};

// Shared outer layout for all order emails
const layout = ({ logo, body }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asapong</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 30px 10px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td align="center" style="background-color: transparent; padding: 24px 24px 12px 24px;">
              <img src="${esc(logo)}" alt="Asapong Logo" style="max-height: 55px; width: auto; display: block; border: 0;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 28px 28px 28px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 14px; text-align: center; border-top: 1px solid #f3f4f6;">
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
</html>
`;

const loadOrderForEmail = async (orderId) => {
  const order = await Orders.findById(orderId).populate('user', 'userName email');
  if (!order) throw new Error(`Order ${orderId} not found for email.`);

  const recipientEmail = order.user?.email;
  if (!recipientEmail) {
    throw new Error(
      `Order ${orderId} has no customer email. Check that the "user" ref in orderSchema matches your user model name ("Users") and that users have an email field.`
    );
  }
  return { order, recipientEmail };
};

// ---------------------------------------------------------------------------
// Payment successful
// ---------------------------------------------------------------------------
export const sendOrderConfirmationEmail = async (orderId) => {
  console.log(`[email] Preparing confirmation for order ${orderId}`);

  const { order, recipientEmail } = await loadOrderForEmail(orderId);
  const customerName = esc(order.user?.userName || 'Valued Customer');
  const logo = process.env.CLOUDINARY_LOG || '';
  const addr = order.shippingAddress;

  const body = `
    <h2 style="color: #111827; margin: 0 0 14px 0; font-size: 18px; font-weight: 700;">Hello ${customerName},</h2>
    <p style="color: #4b5563; margin: 0 0 12px 0; font-size: 14px; line-height: 1.6;">
      Thank you for shopping with <strong>Asapong</strong>!
    </p>
    <p style="color: #4b5563; margin: 0 0 12px 0; font-size: 14px; line-height: 1.6;">
      We've received your payment and your order is confirmed. Our team is now processing it and will begin preparing it for shipment as soon as possible.
    </p>
    <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 14px; line-height: 1.6;">
      We'll keep you updated on your order's progress and send you another email once it has been shipped.
    </p>

    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
      <span style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Order Reference</span><br />
      <span style="color: #4f46e5; font-size: 16px; font-weight: 700;">#${order._id}</span>
    </div>

    <h3 style="color: #111827; margin: 0 0 10px 0; font-size: 15px; font-weight: 700;">Order Items</h3>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #e5e7eb; font-size: 14px; margin-bottom: 20px;">
      <tbody>
        ${buildItemsHtml(order, logo)}
        <tr style="background-color: #f9fafb;">
          <td colspan="2" style="padding: 12px; font-weight: 700; color: #111827;">Total Amount Paid</td>
          <td align="right" style="padding: 12px; font-weight: 800; color: #4f46e5; font-size: 16px;">${money(order.totalPrice)}</td>
        </tr>
      </tbody>
    </table>

    <h3 style="color: #111827; margin: 0 0 8px 0; font-size: 15px; font-weight: 700;">Shipping Details</h3>
    <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 13px; line-height: 1.5; background-color: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
      ${esc(addr.address)}<br />
      ${esc(addr.city)}, ${esc(addr.state)} ${esc(addr.postalCode)}<br />
      ${esc(addr.country)}
    </p>

    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0 0 12px 0;">
      If you have any questions or need assistance, please don't hesitate to contact our support team.
    </p>
    <p style="color: #111827; font-size: 14px; margin: 0; font-weight: 600;">
      Best regards,<br /><span style="color: #4f46e5;">The Asapong Team</span>
    </p>
  `;

  console.log(`[email] Sending confirmation to ${recipientEmail}`);
  const result = await sendEmail({
    to: recipientEmail,
    subject: 'Payment Received – Your Order is Confirmed!',
    html: layout({ logo, body }),
  });
  console.log(`[email] Confirmation sent for order ${orderId}`, result?.messageId || '');
  return result;
};

// ---------------------------------------------------------------------------
// Payment failed / reversed
// ---------------------------------------------------------------------------
export const sendPaymentFailedEmail = async (orderId, { reason, reversed = false } = {}) => {
  console.log(`[email] Preparing payment-failed email for order ${orderId}`);

  const { order, recipientEmail } = await loadOrderForEmail(orderId);
  const customerName = esc(order.user?.userName || 'Valued Customer');
  const logo = process.env.CLOUDINARY_LOG || '';
  const retryUrl = `${process.env.CLIENT_URL}/my-orders`;

  const headline = reversed ? 'Your payment was reversed' : 'Your payment was not successful';
  const intro = reversed
    ? 'The payment for your order was reversed, so it has not been completed.'
    : "We couldn't complete the payment for your order, and you have not been charged for it.";

  const reasonHtml = reason
    ? `
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
      <span style="color: #991b1b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Reason from payment provider</span><br />
      <span style="color: #7f1d1d; font-size: 14px;">${esc(reason)}</span>
    </div>`
    : '';

  const body = `
    <h2 style="color: #111827; margin: 0 0 14px 0; font-size: 18px; font-weight: 700;">Hello ${customerName},</h2>
    <p style="color: #111827; margin: 0 0 12px 0; font-size: 15px; font-weight: 700;">${headline}</p>
    <p style="color: #4b5563; margin: 0 0 16px 0; font-size: 14px; line-height: 1.6;">${intro}</p>

    ${reasonHtml}

    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
      <span style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Order Reference</span><br />
      <span style="color: #4f46e5; font-size: 16px; font-weight: 700;">#${order._id}</span><br />
      <span style="color: #111827; font-size: 14px; font-weight: 600;">Amount due: ${money(order.totalPrice)}</span>
    </div>

    <h3 style="color: #111827; margin: 0 0 10px 0; font-size: 15px; font-weight: 700;">Items in this order</h3>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #e5e7eb; font-size: 14px; margin-bottom: 20px;">
      <tbody>${buildItemsHtml(order, logo)}</tbody>
    </table>

    <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 14px; line-height: 1.6;">
      You can try again from your orders page. Common fixes are checking your card details, confirming you have enough funds, or using a different payment method such as mobile money.
    </p>

    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${esc(retryUrl)}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px;">
        Retry payment
      </a>
    </div>

    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0 0 12px 0;">
      If money was taken from your account, please contact our support team with your order reference above.
    </p>
    <p style="color: #111827; font-size: 14px; margin: 0; font-weight: 600;">
      Best regards,<br /><span style="color: #4f46e5;">The Asapong Team</span>
    </p>
  `;

  console.log(`[email] Sending payment-failed email to ${recipientEmail}`);
  const result = await sendEmail({
    to: recipientEmail,
    subject: reversed
      ? 'Your payment was reversed – Action needed'
      : 'Payment unsuccessful – Please try again',
    html: layout({ logo, body }),
  });
  console.log(`[email] Payment-failed email sent for order ${orderId}`, result?.messageId || '');
  return result;
};
