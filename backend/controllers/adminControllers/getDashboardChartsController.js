import mongoose from 'mongoose';
import { Product } from '../../modules/productSchema.js';
import { Orders } from '../../modules/orderSchema.js';

/* ------------------------------------------------------------------ */
/*  Settings - adjust these to match your data                         */
/* ------------------------------------------------------------------ */

// An order counts as revenue when its paymentStatus is one of these...
const PAID_PAYMENT_STATUSES = ['PAID', 'SUCCESS', 'COMPLETED'];
// ...and its order status is NOT one of these.
const CANCELLED_STATUSES = ['CANCELLED', 'CANCELED', 'REFUNDED', 'FAILED'];

// Products at or below this stock level are "low stock".
const LOW_STOCK_THRESHOLD = 5;

// Used to group revenue into days (Ghana).
const TIMEZONE = 'Africa/Accra';

// Allowed values for ?days=
const ALLOWED_RANGES = [7, 30, 90];
const DEFAULT_RANGE = 30;

// Customers = every user except admins. If your users have no `role` field this
// still matches everyone, because documents without the field pass $ne.
const CUSTOMER_FILTER = { role: { $ne: 'admin' } };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

// Start of a UTC day (Africa/Accra is UTC+0, so this lines up with the local day).
const startOfDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const toDateKey = (date) => date.toISOString().slice(0, 10);

const arrayToMap = (rows) =>
  rows.reduce((acc, row) => {
    acc[row._id ?? 'UNKNOWN'] = row.count;
    return acc;
  }, {});

/* ------------------------------------------------------------------ */
/*  Controller                                                         */
/* ------------------------------------------------------------------ */

// GET /dashboard-stats?days=7|30|90   (admin only - protect the route, see notes)
export const getDashboardStatsController = async (req, res) => {
  try {
    const requestedDays = Number(req.query.days);
    const days = ALLOWED_RANGES.includes(requestedDays) ? requestedDays : DEFAULT_RANGE;

    const now = new Date();
    const periodStart = new Date(startOfDay(now).getTime() - (days - 1) * DAY_MS);
    const previousStart = new Date(periodStart.getTime() - days * DAY_MS);

    const Users = mongoose.models.Users || mongoose.model('Users');

    const paidMatch = {
      paymentStatus: { $in: PAID_PAYMENT_STATUSES },
      status: { $nin: CANCELLED_STATUSES },
    };

    const [orderFacets, productFacets, totalCustomers, newCustomers, recentOrders] = await Promise.all([
      // ---------- orders ----------
      Orders.aggregate([
        {
          $facet: {
            totals: [{ $group: { _id: null, count: { $sum: 1 } } }],
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            byPaymentStatus: [{ $group: { _id: '$paymentStatus', count: { $sum: 1 } } }],
            revenue: [
              { $match: paidMatch },
              { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
            ],
            // current period + the period before it (for the growth comparison)
            daily: [
              { $match: { ...paidMatch, createdAt: { $gte: previousStart } } },
              {
                $group: {
                  _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TIMEZONE } },
                  revenue: { $sum: '$totalPrice' },
                  orders: { $sum: 1 },
                },
              },
            ],
            topProducts: [
              { $match: paidMatch },
              { $unwind: '$items' },
              {
                $group: {
                  _id: '$items.productId',
                  name: { $first: '$items.name' },
                  image: { $first: '$items.image' },
                  unitsSold: { $sum: '$items.quantity' },
                  revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                },
              },
              { $sort: { unitsSold: -1 } },
              { $limit: 5 },
            ],
          },
        },
      ]),

      // ---------- products ----------
      Product.aggregate([
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  inventoryValue: { $sum: { $multiply: ['$price', { $max: ['$stock', 0] }] } },
                },
              },
            ],
            outOfStock: [{ $match: { stock: { $lte: 0 } } }, { $count: 'count' }],
            lowStock: [{ $match: { stock: { $gt: 0, $lte: LOW_STOCK_THRESHOLD } } }, { $count: 'count' }],
            byCategory: [
              { $group: { _id: '$category', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            lowStockItems: [
              { $match: { stock: { $lte: LOW_STOCK_THRESHOLD } } },
              { $sort: { stock: 1 } },
              { $limit: 5 },
              { $project: { name: 1, brand: 1, stock: 1, image: { $arrayElemAt: ['$images', 0] } } },
            ],
          },
        },
      ]),

      // ---------- customers ----------
      Users.countDocuments(CUSTOMER_FILTER),
      Users.countDocuments({ ...CUSTOMER_FILTER, createdAt: { $gte: periodStart } }),

      // ---------- recent orders ----------
      Orders.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .select('orderNumber user totalPrice status paymentStatus createdAt items')
        .populate('user', 'userName email')
        .lean(),
    ]);

    const o = orderFacets[0] || {};
    const p = productFacets[0] || {};

    /* ----- revenue series (fills days with no sales with 0) ----- */
    const dailyMap = new Map((o.daily || []).map((row) => [row._id, row]));

    const series = [];
    let periodRevenue = 0;
    let periodOrders = 0;
    for (let i = 0; i < days; i += 1) {
      const key = toDateKey(new Date(periodStart.getTime() + i * DAY_MS));
      const row = dailyMap.get(key);
      periodRevenue += row?.revenue || 0;
      periodOrders += row?.orders || 0;
      series.push({ date: key, revenue: money(row?.revenue), orders: row?.orders || 0 });
    }

    let previousRevenue = 0;
    for (let i = 0; i < days; i += 1) {
      const key = toDateKey(new Date(previousStart.getTime() + i * DAY_MS));
      previousRevenue += dailyMap.get(key)?.revenue || 0;
    }

    const growthPercent =
      previousRevenue > 0 ? Math.round(((periodRevenue - previousRevenue) / previousRevenue) * 1000) / 10 : null;

    /* ----- summary numbers ----- */
    const totalRevenue = o.revenue?.[0]?.total || 0;
    const paidOrders = o.revenue?.[0]?.count || 0;
    const totalOrders = o.totals?.[0]?.count || 0;
    const byStatus = arrayToMap(o.byStatus || []);

    return res.status(200).json({
      success: true,
      range: { days, from: periodStart, to: now },
      stats: {
        summary: {
          totalRevenue: money(totalRevenue),
          totalOrders,
          paidOrders,
          pendingOrders: byStatus.PENDING || 0,
          averageOrderValue: paidOrders > 0 ? money(totalRevenue / paidOrders) : 0,
          totalCustomers,
          newCustomers,
          totalProducts: p.totals?.[0]?.count || 0,
        },
        revenue: {
          periodRevenue: money(periodRevenue),
          periodOrders,
          previousPeriodRevenue: money(previousRevenue),
          growthPercent, // null when there was no revenue in the previous period
          series,
        },
        orders: {
          byStatus,
          byPaymentStatus: arrayToMap(o.byPaymentStatus || []),
          recent: recentOrders.map((order) => ({
            _id: order._id,
            orderNumber: order.orderNumber,
            customer: order.user?.userName || order.user?.email || 'Unknown',
            totalPrice: money(order.totalPrice),
            itemCount: (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0),
            status: order.status,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt,
          })),
        },
        products: {
          total: p.totals?.[0]?.count || 0,
          outOfStock: p.outOfStock?.[0]?.count || 0,
          lowStock: p.lowStock?.[0]?.count || 0,
          lowStockThreshold: LOW_STOCK_THRESHOLD,
          inventoryValue: money(p.totals?.[0]?.inventoryValue),
          byCategory: (p.byCategory || []).map((row) => ({ category: row._id || 'Uncategorised', count: row.count })),
          topSelling: (o.topProducts || []).map((row) => ({
            productId: row._id,
            name: row.name,
            image: row.image,
            unitsSold: row.unitsSold,
            revenue: money(row.revenue),
          })),
          lowStockItems: p.lowStockItems || [],
        },
      },
    });
  } catch (error) {
    console.error('Error building dashboard stats:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server Error: Unable to load dashboard statistics.',
      error: error.message,
    });
  }
};