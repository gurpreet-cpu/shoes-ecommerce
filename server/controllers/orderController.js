const Order    = require('../models/Order');
const Product  = require('../models/Product');
const Cart     = require('../models/Cart');
const Coupon   = require('../models/Coupon');
const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const ApiResponse  = require('../utils/ApiResponse');
const logger       = require('../services/logger');
const {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendOrderCancelledEmail,
  sendRefundInitiatedAdminEmail,
  sendRTOAdminEmail,
  sendRTOCustomerEmail,
  sendRefundProcessedEmail,
  sendNewOrderAdminEmail,
  sendLowStockAdminEmail,
  sendOutOfStockAdminEmail,
} = require('../services/emailService');
const { generateInvoice } = require('../services/invoiceService');

// ── helpers ───────────────────────────────────────────────────────────────────

async function restoreStock(items) {
  await Promise.all(
    items.map(({ productId, size, quantity }) =>
      Product.updateOne(
        { _id: productId, 'sizes.size': size },
        { $inc: { 'sizes.$.stock': quantity } }
      )
    )
  );
}

function computedFlags(order) {
  const CANCELLABLE = ['pending', 'confirmed', 'processing'];
  const canCancel =
    CANCELLABLE.includes(order.orderStatus) &&
    !(order.orderStatus === 'confirmed' && Date.now() - new Date(order.createdAt).getTime() > 24 * 60 * 60 * 1000);

  return {
    canCancel,
    canReview:          order.orderStatus === 'delivered',
    canReorder:         order.orderStatus === 'delivered',
    canDownloadInvoice: ['paid', 'refunded'].includes(order.paymentStatus) || order.orderStatus === 'confirmed',
  };
}

const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'processing'];

// ── createOrder ───────────────────────────────────────────────────────────────
const createOrder = asyncHandler(async (req, res) => {
  if (!req.user.isEmailVerified) {
    throw new ApiError(403, 'Please verify your email before placing orders');
  }

  const { items, shippingAddress, paymentMethod, couponCode } = req.body;

  // ── Task 6: Duplicate order prevention ───────────────────────────────────────
  const itemProductIds = items.map((i) => i.productId);
  const recentOrder = await Order.findOne({
    user:           req.user._id,
    createdAt:      { $gte: new Date(Date.now() - 60000) },
    'items.product': { $in: itemProductIds },
    orderStatus:    { $ne: 'cancelled' },
  });
  if (recentOrder) {
    throw new ApiError(
      429,
      'Duplicate order detected. Your previous order is being processed.',
      [{ orderId: recentOrder._id, orderNumber: recentOrder.orderNumber }]
    );
  }

  const decremented = [];
  const orderItems  = [];
  let subtotal = 0;

  try {
    for (const { productId, size, quantity } of items) {
      const product = await Product.findOne({ _id: productId, isActive: true });
      if (!product) throw new ApiError(404, `Product not found`);

      const sizeEntry = product.sizes.find((s) => s.size === size);
      if (!sizeEntry) throw new ApiError(400, `Size ${size} not available for ${product.name}`);
      if (sizeEntry.stock < quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name} size ${size}`);
      }

      const updated = await Product.findOneAndUpdate(
        { _id: productId, sizes: { $elemMatch: { size, stock: { $gte: quantity } } } },
        {
          $inc: {
            'sizes.$.stock': -quantity,
            totalSold: quantity,       // Task 8: track total sold
          },
        },
        { new: true }
      );
      if (!updated) {
        throw new ApiError(409, `Stock just ran out for ${product.name} size ${size}`);
      }
      decremented.push({ productId, size, quantity });

      // Task 8: check stock thresholds, send alerts fire-and-forget
      const updatedSizeEntry = updated.sizes.find((s) => s.size === size);
      if (updatedSizeEntry) {
        const remaining = updatedSizeEntry.stock;
        if (remaining === 0) {
          sendOutOfStockAdminEmail(updated, size).catch((err) =>
            logger.error('Out-of-stock email failed:', err)
          );
        } else if (remaining <= (updated.lowStockThreshold || 3)) {
          sendLowStockAdminEmail(updated, size, remaining).catch((err) =>
            logger.error('Low-stock email failed:', err)
          );
        }
      }

      const lockedPrice = product.discountPrice || product.price;
      subtotal += lockedPrice * quantity;

      orderItems.push({
        product:  product._id,
        name:     product.name,
        image:    product.images[0]?.url || '',
        size,
        price:    lockedPrice,
        quantity,
      });
    }
  } catch (err) {
    if (decremented.length > 0) await restoreStock(decremented);
    throw err;
  }

  // --- Shipping ---
  const shippingCharge = subtotal >= 999 ? 0 : 99;

  // --- Coupon ---
  let discount = 0;
  let couponSnapshot;

  if (couponCode) {
    const coupon = await Coupon.findOne({
      code:      couponCode.toUpperCase(),
      isActive:  true,
      expiresAt: { $gt: new Date() },
    });

    if (!coupon || coupon.usedCount >= coupon.usageLimit) {
      await restoreStock(decremented);
      throw new ApiError(400, 'Invalid or expired coupon code');
    }
    if (subtotal < coupon.minOrderAmount) {
      await restoreStock(decremented);
      throw new ApiError(400, `Minimum order ₹${coupon.minOrderAmount} required for this coupon`);
    }

    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
    } else {
      discount = Math.min(coupon.discountValue, subtotal);
    }
    discount = Math.round(discount * 100) / 100;

    coupon.usedCount += 1;
    await coupon.save();

    couponSnapshot = { code: coupon.code, discountAmount: discount };
  }

  const total = Math.round((subtotal - discount + shippingCharge) * 100) / 100;

  // --- Create order ---
  const order = await Order.create({
    user:           req.user._id,
    items:          orderItems,
    shippingAddress,
    pricing:        { subtotal, discount, shippingCharge, total },
    coupon:         couponSnapshot,
    paymentMethod,
    statusHistory:  [{ status: 'pending', timestamp: new Date() }],
  });

  // --- COD: clear cart + send confirmation email ---
  if (paymentMethod === 'cod') {
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], appliedCoupon: undefined }
    );
    sendOrderConfirmationEmail(req.user, order).catch(() => {});
  }

  // Task 2: Admin notification — fire and forget
  sendNewOrderAdminEmail(order, req.user).catch((err) =>
    logger.error('Admin new order email failed:', err)
  );

  res.status(201).json(
    new ApiResponse(201, { order, ...computedFlags(order) }, 'Order created successfully')
  );
});

// ── getMyOrders ───────────────────────────────────────────────────────────────
const getMyOrders = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const skip  = (page - 1) * limit;

  const [orders, totalCount] = await Promise.all([
    Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    Order.countDocuments({ user: req.user._id }),
  ]);

  const enriched = orders.map((o) => ({ ...o.toObject(), ...computedFlags(o) }));

  res.json(
    new ApiResponse(200, {
      orders: enriched,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    })
  );
});

// ── getOrderById ──────────────────────────────────────────────────────────────
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found');
  res.json(new ApiResponse(200, { ...order.toObject(), ...computedFlags(order) }));
});

// ── cancelOrder ───────────────────────────────────────────────────────────────
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found');

  if (!CANCELLABLE_STATUSES.includes(order.orderStatus)) {
    throw new ApiError(400, 'Cannot cancel after shipment');
  }

  // Task 5: 24h window for confirmed orders
  if (
    order.orderStatus === 'confirmed' &&
    Date.now() - new Date(order.createdAt).getTime() > 24 * 60 * 60 * 1000
  ) {
    throw new ApiError(400, 'Cancellation window expired (24 hours after order placement)');
  }

  // Task 5: validate reason enum
  const CANCEL_REASONS = ['changed_mind', 'found_cheaper', 'wrong_item', 'wrong_address', 'other'];
  const { reason, details } = req.body;
  if (!reason || !CANCEL_REASONS.includes(reason)) {
    throw new ApiError(400, `reason must be one of: ${CANCEL_REASONS.join(', ')}`);
  }

  // Restore stock
  await restoreStock(
    order.items.map((i) => ({ productId: i.product, size: i.size, quantity: i.quantity }))
  );

  // Task 5: decrement coupon usedCount if coupon was applied
  if (order.coupon?.code) {
    await Coupon.findOneAndUpdate(
      { code: order.coupon.code },
      { $inc: { usedCount: -1 } }
    );
  }

  order.orderStatus  = 'cancelled';
  order.cancelReason = reason;
  order.cancelDetails = details || '';
  order.statusHistory.push({
    status:    'cancelled',
    timestamp: new Date(),
    note:      `Cancelled by user: ${reason}${details ? ' — ' + details : ''}`,
  });

  // Task 5: initiate refund if paid via Paytm
  if (order.paymentStatus === 'paid') {
    order.paymentStatus    = 'refunded';
    order.refund = {
      status:      'initiated',
      amount:      order.pricing.total,
      initiatedAt: new Date(),
    };
    sendRefundInitiatedAdminEmail(order, order.pricing.total).catch((err) =>
      logger.error('Refund admin email failed:', err)
    );
  }

  await order.save();

  sendOrderCancelledEmail(req.user, order).catch(() => {});

  res.json(new ApiResponse(200, { order, ...computedFlags(order) }, 'Order cancelled'));
});

// ── initiateRTO (admin only) ──────────────────────────────────────────────────
const initiateRTO = asyncHandler(async (req, res) => {
  const { reason, note } = req.body;

  const RTO_REASONS = ['refused', 'not_available', 'wrong_address', 'damaged', 'other'];
  if (!reason || !RTO_REASONS.includes(reason)) {
    throw new ApiError(400, `reason must be one of: ${RTO_REASONS.join(', ')}`);
  }

  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) throw new ApiError(404, 'Order not found');

  if (!['shipped', 'out_for_delivery'].includes(order.orderStatus)) {
    throw new ApiError(400, 'RTO can only be initiated for shipped or out_for_delivery orders');
  }

  order.orderStatus   = 'rto';
  order.rtoStatus     = 'initiated';
  order.rtoDetails    = { initiatedAt: new Date(), reason, note: note || '' };
  order.statusHistory.push({ status: 'rto', timestamp: new Date(), note: `RTO initiated: ${reason}` });

  await order.save();

  sendRTOAdminEmail(order, reason).catch((err) => logger.error('RTO admin email failed:', err));
  sendRTOCustomerEmail(order.user, order).catch((err) => logger.error('RTO customer email failed:', err));

  res.json(new ApiResponse(200, { order }, 'RTO initiated'));
});

// ── completeRTO (admin only) ──────────────────────────────────────────────────
const completeRTO = asyncHandler(async (req, res) => {
  const { note } = req.body;

  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) throw new ApiError(404, 'Order not found');

  if (!['initiated', 'in_transit'].includes(order.rtoStatus)) {
    throw new ApiError(400, 'RTO is not in an active state');
  }

  // Restore stock for all items
  for (const item of order.items) {
    await Product.findOneAndUpdate(
      { _id: item.product, 'sizes.size': item.size },
      { $inc: { 'sizes.$.stock': item.quantity } }
    );
  }

  order.rtoStatus              = 'restocked';
  order.rtoDetails.receivedAt  = new Date();
  order.rtoDetails.restockedAt = new Date();
  order.statusHistory.push({
    status:    'rto_complete',
    timestamp: new Date(),
    note:      note || 'RTO completed and stock restored',
  });

  // Handle refund
  if (order.paymentStatus === 'paid') {
    order.paymentStatus = 'refunded';
    order.refund = {
      status:      'initiated',
      amount:      order.pricing.total,
      initiatedAt: new Date(),
    };
    sendRefundInitiatedAdminEmail(order, order.pricing.total).catch((err) =>
      logger.error('RTO refund admin email failed:', err)
    );
  }

  await order.save();

  res.json(new ApiResponse(200, { order }, 'RTO completed and stock restored'));
});

// ── updateRefund (admin only) ─────────────────────────────────────────────────
const updateRefund = asyncHandler(async (req, res) => {
  const { status, transactionId, note } = req.body;

  const REFUND_STATUSES = ['none', 'initiated', 'processing', 'completed', 'failed'];
  if (!status || !REFUND_STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${REFUND_STATUSES.join(', ')}`);
  }

  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) throw new ApiError(404, 'Order not found');

  order.refund = order.refund || {};
  order.refund.status = status;
  if (transactionId) order.refund.transactionId = transactionId;
  if (note)          order.refund.note = note;

  if (status === 'completed') {
    order.refund.completedAt = new Date();
    sendRefundProcessedEmail(order.user, order).catch((err) =>
      logger.error('Refund processed email failed:', err)
    );
  }

  await order.save();

  res.json(new ApiResponse(200, { order }, 'Refund updated'));
});

// ── reorderItems ──────────────────────────────────────────────────────────────
const reorderItems = asyncHandler(async (req, res) => {
  const originalOrder = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!originalOrder) throw new ApiError(404, 'Order not found');

  const availableItems   = [];
  const unavailableItems = [];

  for (const item of originalOrder.items) {
    const product = await Product.findOne({ _id: item.product, isActive: true });
    if (!product) {
      unavailableItems.push({ ...item.toObject(), reason: 'Product discontinued' });
      continue;
    }
    const sizeEntry = product.sizes.find((s) => s.size === item.size);
    if (!sizeEntry) {
      unavailableItems.push({ ...item.toObject(), reason: `Size ${item.size} no longer available` });
      continue;
    }
    if (sizeEntry.stock < 1) {
      unavailableItems.push({ ...item.toObject(), reason: `Size ${item.size} out of stock` });
      continue;
    }
    availableItems.push({ ...item.toObject(), currentPrice: product.discountPrice || product.price });
  }

  // Add available items to cart
  if (availableItems.length > 0) {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, items: [] });

    for (const item of availableItems) {
      const existingIdx = cart.items.findIndex(
        (ci) => ci.product.toString() === item.product.toString() && ci.size === item.size
      );
      if (existingIdx >= 0) {
        cart.items[existingIdx].quantity += 1;
      } else {
        cart.items.push({
          product:  item.product,
          size:     item.size,
          quantity: 1,
          price:    item.currentPrice,
        });
      }
    }
    await cart.save();
  }

  const message = `${availableItems.length} item(s) added to cart${
    unavailableItems.length > 0 ? `, ${unavailableItems.length} item(s) unavailable` : ''
  }`;

  res.json(new ApiResponse(200, { availableItems, unavailableItems, message }));
});

// ── downloadInvoice ───────────────────────────────────────────────────────────
const downloadInvoice = asyncHandler(async (req, res) => {
  const query = req.user.role === 'admin'
    ? { _id: req.params.id }
    : { _id: req.params.id, user: req.user._id };

  const order = await Order.findOne(query).populate('user', 'name email phone');
  if (!order) throw new ApiError(404, 'Order not found');

  const eligible =
    order.paymentStatus === 'paid' ||
    order.paymentStatus === 'refunded' ||
    order.orderStatus === 'confirmed';

  if (!eligible) {
    throw new ApiError(400, 'Invoice only available for confirmed/paid orders');
  }

  const pdfBuffer = await generateInvoice(order, order.user);

  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `attachment; filename="invoice-${order.orderNumber}.pdf"`,
    'Content-Length':      pdfBuffer.length,
  });
  res.send(pdfBuffer);
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  initiateRTO,
  completeRTO,
  updateRefund,
  reorderItems,
  downloadInvoice,
};
