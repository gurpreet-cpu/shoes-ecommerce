const Order   = require('../models/Order');
const Product = require('../models/Product');
const User    = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const ApiResponse  = require('../utils/ApiResponse');
const {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendOrderCancelledEmail,
} = require('../services/emailService');

// ── status transition map ─────────────────────────────────────────────────────

const TRANSITIONS = {
  pending:          ['confirmed', 'cancelled'],
  confirmed:        ['processing', 'cancelled'],
  processing:       ['shipped', 'cancelled'],
  shipped:          ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered:        [],
  cancelled:        [],
};

// ── getDashboard ──────────────────────────────────────────────────────────────

const getDashboard = asyncHandler(async (req, res) => {
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    revenueResult,
    orderStatsRaw,
    totalUsers,
    totalProducts,
    recentOrders,
    topProducts,
    todayRevenueResult,
    monthRevenueResult,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
    Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]),
    User.countDocuments({ role: 'user' }),
    Product.countDocuments({ isActive: true }),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email')
      .select('-__v'),
    Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id:        '$items.product',
          name:       { $first: '$items.name' },
          totalSold:  { $sum: '$items.quantity' },
          revenue:    { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
  ]);

  const orderStats = {
    pending: 0, confirmed: 0, processing: 0,
    shipped: 0, out_for_delivery: 0, delivered: 0, cancelled: 0,
  };
  orderStatsRaw.forEach((s) => {
    if (s._id in orderStats) orderStats[s._id] = s.count;
  });

  res.json(new ApiResponse(200, {
    totalRevenue:  revenueResult[0]?.total       || 0,
    todayRevenue:  todayRevenueResult[0]?.total  || 0,
    monthRevenue:  monthRevenueResult[0]?.total  || 0,
    orderStats,
    totalUsers,
    totalProducts,
    recentOrders,
    topProducts,
  }));
});

// ── getAllOrders ───────────────────────────────────────────────────────────────

const getAllOrders = asyncHandler(async (req, res) => {
  const { status, paymentMethod, paymentStatus, dateFrom, dateTo } = req.query;
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (status)        filter.orderStatus   = status;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
  }

  const [orders, totalCount] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email phone')
      .select('-__v'),
    Order.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, {
    orders,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
  }));
});

// ── getOrderDetail ────────────────────────────────────────────────────────────

const getOrderDetail = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email phone')
    .select('-__v');
  if (!order) throw new ApiError(404, 'Order not found');
  res.json(new ApiResponse(200, order));
});

// ── updateOrderStatus ─────────────────────────────────────────────────────────

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!status) throw new ApiError(400, 'status is required');

  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw new ApiError(404, 'Order not found');

  const allowed = TRANSITIONS[order.orderStatus] || [];
  if (!allowed.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status transition from '${order.orderStatus}' to '${status}'`
    );
  }

  order.orderStatus = status;
  order.statusHistory.push({ status, timestamp: new Date(), note: note || '' });
  if (status === 'delivered') order.deliveredAt = new Date();

  await order.save();

  // Fire email — non-blocking
  const user = order.user;
  if (status === 'confirmed') {
    sendOrderConfirmationEmail(user, order).catch(() => {});
  } else if (['shipped', 'out_for_delivery', 'delivered'].includes(status)) {
    sendOrderStatusEmail(user, order, status).catch(() => {});
  } else if (status === 'cancelled') {
    sendOrderCancelledEmail(user, order).catch(() => {});
  }

  res.json(new ApiResponse(200, { order }, 'Order status updated'));
});

// ── getAllUsers ────────────────────────────────────────────────────────────────

const getAllUsers = asyncHandler(async (req, res) => {
  const { search, role } = req.query;
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (role) filter.role = role;
  if (search) {
    const re = new RegExp(search, 'i');
    filter.$or = [{ name: re }, { email: re }];
  }

  const [users, totalCount] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-password -refreshToken -__v'),
    User.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, {
    users,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
  }));
});

// ── updateUserRole ────────────────────────────────────────────────────────────

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!role || !['user', 'admin'].includes(role)) {
    throw new ApiError(400, 'role must be "user" or "admin"');
  }

  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'Cannot change your own role');
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  ).select('-password -refreshToken -__v');

  if (!user) throw new ApiError(404, 'User not found');

  res.json(new ApiResponse(200, { message: 'Role updated', user }));
});

// ── deactivateUser ────────────────────────────────────────────────────────────

const deactivateUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'Cannot deactivate your own account');
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false, refreshToken: null },
    { new: true }
  ).select('-password -refreshToken -__v');

  if (!user) throw new ApiError(404, 'User not found');

  res.json(new ApiResponse(200, { message: 'User deactivated' }));
});

// ── getRevenueAnalytics ───────────────────────────────────────────────────────

const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  if (!['day', 'week', 'month'].includes(period)) {
    throw new ApiError(400, 'period must be day, week, or month');
  }

  let groupId;
  if (period === 'day') {
    groupId = {
      year:  { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day:   { $dayOfMonth: '$createdAt' },
    };
  } else if (period === 'week') {
    groupId = {
      year: { $year: '$createdAt' },
      week: { $week: '$createdAt' },
    };
  } else {
    groupId = {
      year:  { $year: '$createdAt' },
      month: { $month: '$createdAt' },
    };
  }

  const raw = await Order.aggregate([
    { $match: { paymentStatus: 'paid' } },
    {
      $group: {
        _id:        groupId,
        revenue:    { $sum: '$pricing.total' },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
    { $limit: 30 },
  ]);

  const data = raw.map((entry) => {
    let date;
    const { year, month, day, week } = entry._id;
    if (period === 'day') {
      date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (period === 'week') {
      date = `${year}-W${String(week).padStart(2, '0')}`;
    } else {
      date = `${year}-${String(month).padStart(2, '0')}`;
    }
    return { date, revenue: entry.revenue, orderCount: entry.orderCount };
  });

  res.json(new ApiResponse(200, { period, data }));
});

// ── getProductAnalytics ───────────────────────────────────────────────────────

const getProductAnalytics = asyncHandler(async (req, res) => {
  const topProducts = await Order.aggregate([
    { $match: { orderStatus: 'delivered' } },
    { $unwind: '$items' },
    {
      $group: {
        _id:          '$items.product',
        name:         { $first: '$items.name' },
        totalSold:    { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 20 },
  ]);

  res.json(new ApiResponse(200, { topProducts }));
});

module.exports = {
  getDashboard,
  getAllOrders,
  getOrderDetail,
  updateOrderStatus,
  getAllUsers,
  updateUserRole,
  deactivateUser,
  getRevenueAnalytics,
  getProductAnalytics,
};
