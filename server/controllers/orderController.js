const Order   = require('../models/Order');
const Product = require('../models/Product');
const Cart    = require('../models/Cart');
const Coupon  = require('../models/Coupon');
const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const ApiResponse  = require('../utils/ApiResponse');
const { sendOrderConfirmationEmail, sendOrderStatusEmail } = require('../services/emailService');

// ── helpers ───────────────────────────────────────────────────────────────────

async function restoreStock(decremented) {
  await Promise.all(
    decremented.map(({ productId, size, quantity }) =>
      Product.updateOne(
        { _id: productId, 'sizes.size': size },
        { $inc: { 'sizes.$.stock': quantity } }
      )
    )
  );
}

const CANCELLABLE = ['pending', 'confirmed', 'processing'];

// ── createOrder ───────────────────────────────────────────────────────────────
const createOrder = asyncHandler(async (req, res) => {
  if (!req.user.isEmailVerified) {
    throw new ApiError(403, 'Please verify your email before placing orders');
  }

  const { items, shippingAddress, paymentMethod, couponCode } = req.body;

  const decremented = [];
  const orderItems  = [];
  let subtotal = 0;

  try {
    for (const { productId, size, quantity } of items) {
      // Always fetch price from DB — never trust client
      const product = await Product.findOne({ _id: productId, isActive: true });
      if (!product) throw new ApiError(404, `Product not found`);

      const sizeEntry = product.sizes.find((s) => s.size === size);
      if (!sizeEntry) throw new ApiError(400, `Size ${size} not available for ${product.name}`);
      if (sizeEntry.stock < quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name} size ${size}`);
      }

      // Atomic decrement — $elemMatch ensures both conditions hit the same array element
      const updated = await Product.findOneAndUpdate(
        { _id: productId, sizes: { $elemMatch: { size, stock: { $gte: quantity } } } },
        { $inc: { 'sizes.$.stock': -quantity } },
        { new: true }
      );
      if (!updated) {
        throw new ApiError(409, `Stock just ran out for ${product.name} size ${size}`);
      }
      decremented.push({ productId, size, quantity });

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

  res.status(201).json(new ApiResponse(201, { order }, 'Order created successfully'));
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

  res.json(
    new ApiResponse(200, {
      orders,
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
  res.json(new ApiResponse(200, order));
});

// ── cancelOrder ───────────────────────────────────────────────────────────────
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found');

  if (!CANCELLABLE.includes(order.orderStatus)) {
    throw new ApiError(400, 'Cannot cancel after shipment');
  }

  const { reason } = req.body;

  // Restore stock for all items
  await restoreStock(
    order.items.map((i) => ({ productId: i.product, size: i.size, quantity: i.quantity }))
  );

  order.orderStatus  = 'cancelled';
  order.cancelReason = reason || '';
  order.statusHistory.push({
    status:    'cancelled',
    timestamp: new Date(),
    note:      reason || 'Cancelled by user',
  });

  if (order.paymentStatus === 'paid') {
    order.paymentStatus = 'refunded';
  }

  await order.save();

  sendOrderStatusEmail(req.user, order, 'cancelled').catch(() => {});

  res.json(new ApiResponse(200, { order }, 'Order cancelled'));
});

module.exports = { createOrder, getMyOrders, getOrderById, cancelOrder };
