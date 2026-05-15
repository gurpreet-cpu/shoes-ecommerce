const Order   = require('../models/Order');
const Product = require('../models/Product');
const User    = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const ApiResponse  = require('../utils/ApiResponse');
const logger       = require('../services/logger');
const { cleanupExpiredPayments } = require('../services/cronService');
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
  shipped:          ['out_for_delivery', 'cancelled', 'rto'],
  out_for_delivery: ['delivered', 'cancelled', 'rto'],
  delivered:        [],
  cancelled:        [],
  rto:              [],
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
    pendingRefunds,
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
    Order.countDocuments({ 'refund.status': 'initiated' }),
  ]);

  const orderStats = {
    pending: 0, confirmed: 0, processing: 0,
    shipped: 0, out_for_delivery: 0, delivered: 0, cancelled: 0, rto: 0,
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
    pendingRefunds,
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
    .populate('adminNotes.addedBy', 'name')
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

// ── exportOrders (CSV) ────────────────────────────────────────────────────────

const exportOrders = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, status } = req.query;
  const filter = {};
  if (status)  filter.orderStatus = status;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
  }

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .populate('user', 'name email phone')
    .limit(5000);

  const escape = (v) => {
    const s = String(v == null ? '' : v).replace(/"/g, '""');
    return `"${s}"`;
  };

  const header = [
    'Order#', 'Date', 'Customer', 'Email', 'Phone', 'Items',
    'Subtotal', 'Discount', 'Shipping', 'Total',
    'Payment Method', 'Payment Status', 'Order Status', 'Address',
  ].map(escape).join(',');

  const rows = orders.map((o) => {
    const itemSummary = o.items
      .map((i) => `${i.name} (Sz:${i.size} x${i.quantity})`)
      .join('; ');
    const addr = o.shippingAddress;
    const address = `${addr.street}, ${addr.city}, ${addr.state} - ${addr.pincode}`;

    return [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString('en-IN'),
      o.user?.name || addr.name,
      o.user?.email || '',
      o.user?.phone || addr.phone,
      itemSummary,
      o.pricing.subtotal,
      o.pricing.discount || 0,
      o.pricing.shippingCharge || 0,
      o.pricing.total,
      o.paymentMethod,
      o.paymentStatus,
      o.orderStatus,
      address,
    ].map(escape).join(',');
  });

  const csv = [header, ...rows].join('\n');
  const date = new Date().toISOString().split('T')[0];

  res.set({
    'Content-Type':        'text/csv',
    'Content-Disposition': `attachment; filename="orders-${date}.csv"`,
  });
  res.send(csv);
});

// ── getCustomerProfile ────────────────────────────────────────────────────────

const getCustomerProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -refreshToken -__v');
  if (!user) throw new ApiError(404, 'User not found');

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const skip  = (page - 1) * limit;

  const [orders, totalOrders, statsAgg, categoryAgg] = await Promise.all([
    Order.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    Order.countDocuments({ user: req.params.id }),
    Order.aggregate([
      { $match: { user: user._id, paymentStatus: 'paid' } },
      { $group: { _id: null, totalSpent: { $sum: '$pricing.total' }, orderCount: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { user: user._id } },
      { $unwind: '$items' },
      {
        $lookup: {
          from:         'products',
          localField:   'items.product',
          foreignField: '_id',
          as:           'productInfo',
        },
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$productInfo.category', count: { $sum: '$items.quantity' } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
  ]);

  const stats = statsAgg[0] || { totalSpent: 0, orderCount: 0 };
  const avgOrderValue = stats.orderCount > 0 ? Math.round(stats.totalSpent / stats.orderCount) : 0;

  res.json(new ApiResponse(200, {
    user,
    orders,
    totalOrders,
    totalPages:   Math.ceil(totalOrders / limit),
    page,
    totalSpent:   stats.totalSpent,
    avgOrderValue,
    topCategory:  categoryAgg[0]?._id || null,
  }));
});

// ── bulkUpdateOrderStatus ─────────────────────────────────────────────────────

const bulkUpdateOrderStatus = asyncHandler(async (req, res) => {
  const { orderIds, status, note } = req.body;

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    throw new ApiError(400, 'orderIds array is required');
  }
  if (!status) throw new ApiError(400, 'status is required');

  const orders = await Order.find({ _id: { $in: orderIds } }).populate('user', 'name email');
  const failed  = [];
  const toUpdate = [];

  for (const order of orders) {
    const allowed = TRANSITIONS[order.orderStatus] || [];
    if (!allowed.includes(status)) {
      failed.push({ orderId: order._id, orderNumber: order.orderNumber, reason: `Cannot transition from ${order.orderStatus} to ${status}` });
    } else {
      toUpdate.push(order._id);
    }
  }

  if (toUpdate.length > 0) {
    await Order.bulkWrite(
      toUpdate.map((id) => ({
        updateOne: {
          filter: { _id: id },
          update: {
            $set:  { orderStatus: status },
            $push: { statusHistory: { status, timestamp: new Date(), note: note || '' } },
          },
        },
      }))
    );

    // Fire emails — non-blocking
    for (const order of orders.filter((o) => toUpdate.some((id) => id.equals(o._id)))) {
      if (status === 'confirmed') {
        sendOrderConfirmationEmail(order.user, order).catch(() => {});
      } else if (['shipped', 'out_for_delivery', 'delivered'].includes(status)) {
        sendOrderStatusEmail(order.user, order, status).catch(() => {});
      } else if (status === 'cancelled') {
        sendOrderCancelledEmail(order.user, order).catch(() => {});
      }
    }
  }

  res.json(new ApiResponse(200, { updated: toUpdate.length, failed }));
});

// ── adminSearch ───────────────────────────────────────────────────────────────

const adminSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) throw new ApiError(400, 'Search term must be at least 2 characters');

  const re = new RegExp(q.trim(), 'i');

  const [orders, users, products] = await Promise.all([
    Order.find({ orderNumber: re })
      .limit(10)
      .populate('user', 'name email')
      .select('orderNumber orderStatus paymentStatus pricing.total createdAt'),
    User.find({ $or: [{ name: re }, { email: re }] })
      .limit(10)
      .select('name email role createdAt lastLoginAt'),
    Product.find({ name: re, isActive: true })
      .limit(10)
      .select('name slug images price discountPrice ratings'),
  ]);

  res.json(new ApiResponse(200, { orders, users, products }));
});

// ── addAdminNote ──────────────────────────────────────────────────────────────

const addAdminNote = asyncHandler(async (req, res) => {
  const { note } = req.body;
  if (!note || !note.trim()) throw new ApiError(400, 'note is required');

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        adminNotes: {
          note:    note.trim(),
          addedBy: req.user._id,
          addedAt: new Date(),
        },
      },
    },
    { new: true }
  ).populate('adminNotes.addedBy', 'name');

  if (!order) throw new ApiError(404, 'Order not found');

  res.json(new ApiResponse(200, { adminNotes: order.adminNotes }, 'Note added'));
});

// ── getInventory ──────────────────────────────────────────────────────────────

const getInventory = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true })
    .select('name brand images sizes lowStockThreshold totalSold');

  const outOfStock = [];
  const critical   = [];
  const low        = [];

  for (const product of products) {
    const threshold = product.lowStockThreshold || 3;
    for (const sizeEntry of product.sizes) {
      if (sizeEntry.stock === 0) {
        outOfStock.push({ product: { _id: product._id, name: product.name, brand: product.brand, image: product.images[0]?.url }, size: sizeEntry.size, stock: 0 });
      } else if (sizeEntry.stock <= 2) {
        critical.push({ product: { _id: product._id, name: product.name, brand: product.brand, image: product.images[0]?.url }, size: sizeEntry.size, stock: sizeEntry.stock });
      } else if (sizeEntry.stock <= threshold) {
        low.push({ product: { _id: product._id, name: product.name, brand: product.brand, image: product.images[0]?.url }, size: sizeEntry.size, stock: sizeEntry.stock });
      }
    }
  }

  res.json(new ApiResponse(200, { outOfStock, critical, low }));
});

// ── updateInventory ───────────────────────────────────────────────────────────

const updateInventory = asyncHandler(async (req, res) => {
  const { sizes } = req.body;
  if (!Array.isArray(sizes) || sizes.length === 0) {
    throw new ApiError(400, 'sizes array is required: [{ size, stock }]');
  }

  const product = await Product.findOne({ _id: req.params.productId, isActive: true });
  if (!product) throw new ApiError(404, 'Product not found');

  for (const { size, stock } of sizes) {
    if (typeof stock !== 'number' || stock < 0) {
      throw new ApiError(400, `Invalid stock value for size ${size}`);
    }
    const idx = product.sizes.findIndex((s) => s.size === size);
    if (idx >= 0) {
      product.sizes[idx].stock = stock;
    } else {
      product.sizes.push({ size, stock });
    }
  }

  await product.save();

  res.json(new ApiResponse(200, { sizes: product.sizes }, 'Inventory updated'));
});

// ── cleanupExpiredPaymentsRoute ───────────────────────────────────────────────

const cleanupExpiredPaymentsRoute = asyncHandler(async (req, res) => {
  const cleaned = await cleanupExpiredPayments();
  res.json(new ApiResponse(200, { cleaned }, `Cleaned up ${cleaned} expired payment orders`));
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
  exportOrders,
  getCustomerProfile,
  bulkUpdateOrderStatus,
  adminSearch,
  addAdminNote,
  getInventory,
  updateInventory,
  cleanupExpiredPaymentsRoute,
};
