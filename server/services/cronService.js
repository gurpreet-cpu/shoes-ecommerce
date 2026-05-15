const cron = require('node-cron');
const Order   = require('../models/Order');
const Product = require('../models/Product');
const User    = require('../models/User');
const logger  = require('./logger');
const { sendDailyReportAdminEmail } = require('./emailService');

// ── cleanupExpiredPayments ────────────────────────────────────────────────────

async function cleanupExpiredPayments() {
  const expiredOrders = await Order.find({
    paymentStatus:   'pending',
    paymentMethod:   'paytm',
    paymentExpiresAt: { $lt: new Date() },
  });

  for (const order of expiredOrders) {
    order.paymentStatus = 'failed';
    order.orderStatus   = 'cancelled';
    order.statusHistory.push({
      status:    'cancelled',
      timestamp: new Date(),
      note:      'Auto-cancelled: payment timeout',
    });

    for (const item of order.items) {
      await Product.findOneAndUpdate(
        { _id: item.product, 'sizes.size': item.size },
        { $inc: { 'sizes.$.stock': item.quantity } }
      );
    }

    await order.save();
    logger.info(`[Cron] Auto-cancelled expired order: ${order.orderNumber}`);
  }

  logger.info(`[Cron] Cleaned up ${expiredOrders.length} expired payment orders`);
  return expiredOrders.length;
}

// ── Daily report — 11:59 PM IST = 18:29 UTC ──────────────────────────────────

cron.schedule('29 18 * * *', async () => {
  logger.info('[Cron] Running daily report job');

  try {
    const today     = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow  = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [
      todayOrders,
      todayRevenueAgg,
      newUsers,
      ordersByStatus,
      topProduct,
      yesterdayOrders,
      yesterdayRevenueAgg,
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),

      Order.aggregate([
        { $match: { createdAt: { $gte: today, $lt: tomorrow }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),

      User.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),

      Order.aggregate([
        { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      ]),

      Order.aggregate([
        { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', totalSold: { $sum: '$items.quantity' } } },
        { $sort: { totalSold: -1 } },
        { $limit: 1 },
      ]),

      Order.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),

      Order.aggregate([
        { $match: { createdAt: { $gte: yesterday, $lt: today }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),
    ]);

    const stats = {
      date:             today.toDateString(),
      todayOrders,
      todayRevenue:     todayRevenueAgg[0]?.total     || 0,
      newUsers,
      ordersByStatus,
      topProduct:       topProduct[0]?._id            || 'No orders today',
      yesterdayOrders,
      yesterdayRevenue: yesterdayRevenueAgg[0]?.total || 0,
    };

    await sendDailyReportAdminEmail(stats);
    logger.info('[Cron] Daily report email sent successfully');

    // Also cleanup expired payments as part of nightly run
    await cleanupExpiredPayments();

  } catch (err) {
    logger.error('[Cron] Daily report job failed:', err);
  }
}, {
  timezone: 'UTC',
});

logger.info('[Cron] Scheduled: daily report at 18:29 UTC (11:59 PM IST)');

module.exports = { cleanupExpiredPayments };
