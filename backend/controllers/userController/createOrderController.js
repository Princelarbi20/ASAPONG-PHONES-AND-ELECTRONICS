import mongoose from 'mongoose';
import { Product } from '../../modules/productSchema.js';
import { Orders } from '../../modules/orderSchema.js';
import { Counter } from '../../modules/counterSchema.js';
import { sendCashOnDeliveryOrderEmail } from '../../utils/orderEmail.js';

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

// How long a just-created unpaid order can be reused after a duplicate request
const RECENT_ORDER_WINDOW_MS = 15 * 60 * 1000;

// 6-digit order numbers: 100001 ... 999999
const ORDER_NUMBER_BASE = 100000;
const ORDER_NUMBER_MAX = 999999;

// Atomically get the next order number (runs inside the transaction,
// so if the order fails to save, the number is rolled back too)
const getNextOrderNumber = async (session) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'orderNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );

  const orderNumber = ORDER_NUMBER_BASE + counter.seq;
  if (orderNumber > ORDER_NUMBER_MAX) {
    fail(500, 'Order number range exhausted. Please contact support.');
  }
  return orderNumber;
};

const populateOrder = (orderId) =>
  Orders.findById(orderId)
    .populate('user', 'userName email')
    .populate('items.productId', 'name price images description brand category stock specifications');

export const createOrderController = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { shippingAddress, paymentMethod = 'ONLINE' } = req.body;
    if (!['COD', 'ONLINE'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method.' });
    }
    if (!shippingAddress || !['address', 'city', 'state', 'country', 'postalCode'].every((field) => shippingAddress[field])) {
      return res.status(400).json({ success: false, message: 'A complete shipping address is required.' });
    }
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Authentication required to place an order.' });

    const RegisterModel = mongoose.models.Users || mongoose.model('Users');
    let orderId;
    let reusedExisting = false;

    await session.withTransaction(async () => {
      // Reset in case the transaction callback is retried
      orderId = undefined;
      reusedExisting = false;

      const user = await RegisterModel.findById(req.user.id).session(session).populate('cart.productId');
      if (!user) fail(404, 'User account not found.');

      // Duplicate-request guard: empty cart + a very recent unpaid order = reuse it
      if (!user.cart?.length) {
        const recentOrder = await Orders.findOne({
          user: req.user.id,
          paymentStatus: 'PENDING',
          status: 'PENDING',
          createdAt: { $gte: new Date(Date.now() - RECENT_ORDER_WINDOW_MS) },
        })
          .sort({ createdAt: -1 })
          .session(session);

        if (recentOrder) {
          orderId = recentOrder._id;
          reusedExisting = true;
          return;
        }

        fail(400, 'Your cart is empty.');
      }

      const items = [];
      let totalPesewas = 0;

      for (const item of user.cart) {
        const product = item.productId;
        if (!product) fail(404, 'A product in your cart no longer exists.');
        if (!Number.isInteger(item.quantity) || item.quantity < 1) fail(400, 'Cart contains an invalid quantity.');

        // Atomic stock decrement (reserves the stock for this order)
        const stockResult = await Product.updateOne(
          { _id: product._id, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session }
        );
        if (stockResult.modifiedCount !== 1) fail(409, `${product.name} no longer has enough stock.`);

        const wholeUnitPrice = Math.round(Number(product.price));
        items.push({
          productId: product._id,
          name: product.name,
          price: wholeUnitPrice,
          quantity: item.quantity,
          image: product.images?.[0] || '',
        });

        // New orders always use whole Ghana cedi amounts.
        totalPesewas += wholeUnitPrice * 100 * item.quantity;
      }

      const totalPrice = totalPesewas / 100;
      const orderNumber = await getNextOrderNumber(session);

      const [order] = await Orders.create(
        [
          {
            orderNumber,
            user: req.user.id,
            items,
            totalPrice,
            status: 'PENDING',
            paymentStatus: 'PENDING',
            shippingAddress: {
              address: shippingAddress.address,
              city: shippingAddress.city,
              state: shippingAddress.state,
              country: shippingAddress.country,
              postalCode: shippingAddress.postalCode,
            },
          },
        ],
        { session }
      );

      orderId = order._id;
      await RegisterModel.findByIdAndUpdate(req.user.id, { $set: { cart: [] } }, { session });
    });

    const order = await populateOrder(orderId);

    let emailSent = null;
    if (!reusedExisting && paymentMethod === 'COD') {
      try {
        const emailResult = await sendCashOnDeliveryOrderEmail(orderId);
        emailSent = Boolean(emailResult?.success);
        if (!emailSent) console.error('Cash-on-delivery order email was not sent:', emailResult?.error || 'Unknown mailer error');
      } catch (emailError) {
        emailSent = false;
        console.error('Failed to send cash-on-delivery order email:', emailError);
      }
    }

    return res.status(reusedExisting ? 200 : 201).json({
      success: true,
      message: reusedExisting
        ? 'Existing unpaid order returned. Proceed to payment.'
        : paymentMethod === 'COD' ? 'Order placed with Cash on Delivery.' : 'Order created. Proceed to payment.',
      emailSent,
      order,
    });
  } catch (error) {
    return next(error);
  } finally {
    await session.endSession();
  }
};
