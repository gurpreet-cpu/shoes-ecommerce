const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { findValidCoupon, computeDiscount } = require('./couponController');

// ── helpers ───────────────────────────────────────────────────────────────────

function calcTotals(cart) {
  const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = cart.appliedCoupon?.discountAmount || 0;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round((subtotal - discount) * 100) / 100,
  };
}

function cartPayload(cart, totals) {
  return {
    items: cart.items,
    appliedCoupon: cart.appliedCoupon?.code ? cart.appliedCoupon : null,
    totals,
  };
}

// Re-evaluate coupon after cart changes; removes it if subtotal < minOrderAmount
async function revalidateCoupon(cart) {
  if (!cart.appliedCoupon?.code) return;

  const Coupon = require('../models/Coupon');
  const coupon = await Coupon.findOne({
    code: cart.appliedCoupon.code,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });

  const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (!coupon || coupon.usedCount >= coupon.usageLimit || subtotal < coupon.minOrderAmount) {
    cart.appliedCoupon = undefined;
  } else {
    cart.appliedCoupon.discountAmount = computeDiscount(coupon, subtotal);
  }
}

function emptyCartResponse() {
  return { items: [], appliedCoupon: null, totals: { subtotal: 0, discount: 0, total: 0 } };
}

// ── controllers ───────────────────────────────────────────────────────────────

const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    'items.product',
    'name slug images price discountPrice sizes isActive'
  );

  if (!cart) return res.json(new ApiResponse(200, emptyCartResponse()));

  // Silently remove items whose product is inactive or deleted
  const activeBefore = cart.items.length;
  cart.items = cart.items.filter((i) => i.product && i.product.isActive !== false);
  if (cart.items.length !== activeBefore) await cart.save();

  const totals = calcTotals(cart);
  res.json(new ApiResponse(200, cartPayload(cart, totals)));
});

const addItem = asyncHandler(async (req, res) => {
  const { productId, size, quantity } = req.body;
  if (!productId || !size || !quantity) {
    throw new ApiError(400, 'productId, size, and quantity are required');
  }
  if (quantity < 1) throw new ApiError(400, 'Quantity must be at least 1');

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new ApiError(404, 'Product not found');

  const sizeEntry = product.sizes.find((s) => s.size === size);
  if (!sizeEntry) throw new ApiError(400, `Size ${size} not available for this product`);

  const price = product.discountPrice || product.price;

  // Find or create cart
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  // Count unique items (distinct product+size combos)
  const existingCombo = cart.items.find(
    (i) => i.product.toString() === productId && i.size === size
  );
  if (!existingCombo && cart.items.length >= 20) {
    throw new ApiError(400, 'Cart cannot have more than 20 items');
  }

  const existing = cart.items.find(
    (i) => i.product.toString() === productId && i.size === size
  );

  if (existing) {
    const newQty = existing.quantity + quantity;
    if (sizeEntry.stock < newQty) {
      throw new ApiError(400, `Insufficient stock — only ${sizeEntry.stock} left in size ${size}`);
    }
    existing.quantity = newQty;
    existing.price = price;
  } else {
    if (sizeEntry.stock < quantity) {
      throw new ApiError(400, `Insufficient stock — only ${sizeEntry.stock} left in size ${size}`);
    }
    cart.items.push({ product: productId, size, quantity, price });
  }

  await revalidateCoupon(cart);
  await cart.save();

  const totals = calcTotals(cart);
  res.json(new ApiResponse(200, cartPayload(cart, totals)));
});

const updateItem = asyncHandler(async (req, res) => {
  const { productId, size, quantity } = req.body;
  if (!productId || !size || quantity === undefined) {
    throw new ApiError(400, 'productId, size, and quantity are required');
  }
  if (quantity < 0) throw new ApiError(400, 'Quantity cannot be negative');

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError(404, 'Cart not found');

  const idx = cart.items.findIndex(
    (i) => i.product.toString() === productId && i.size === size
  );
  if (idx === -1) throw new ApiError(404, 'Item not found in cart');

  if (quantity === 0) {
    cart.items.splice(idx, 1);
  } else {
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) throw new ApiError(404, 'Product not found');

    const sizeEntry = product.sizes.find((s) => s.size === size);
    if (!sizeEntry) throw new ApiError(400, `Size ${size} not available`);
    if (sizeEntry.stock < quantity) {
      throw new ApiError(400, `Insufficient stock — only ${sizeEntry.stock} left in size ${size}`);
    }

    cart.items[idx].quantity = quantity;
    cart.items[idx].price = product.discountPrice || product.price;
  }

  await revalidateCoupon(cart);
  await cart.save();

  const totals = calcTotals(cart);
  res.json(new ApiResponse(200, cartPayload(cart, totals)));
});

const removeItem = asyncHandler(async (req, res) => {
  const { productId, size } = req.body;
  if (!productId || !size) throw new ApiError(400, 'productId and size are required');

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError(404, 'Cart not found');

  const before = cart.items.length;
  cart.items = cart.items.filter(
    (i) => !(i.product.toString() === productId && i.size === size)
  );
  if (cart.items.length === before) throw new ApiError(404, 'Item not found in cart');

  await revalidateCoupon(cart);
  await cart.save();

  const totals = calcTotals(cart);
  res.json(new ApiResponse(200, cartPayload(cart, totals)));
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.json(new ApiResponse(200, null, 'Cart cleared'));

  cart.items = [];
  cart.appliedCoupon = undefined;
  await cart.save();

  res.json(new ApiResponse(200, null, 'Cart cleared'));
});

const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw new ApiError(400, 'Coupon code is required');

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) throw new ApiError(400, 'Cart is empty');

  const coupon = await findValidCoupon(code);

  const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  if (subtotal < coupon.minOrderAmount) {
    throw new ApiError(400, `Minimum order ₹${coupon.minOrderAmount} required for this coupon`);
  }

  const discountAmount = computeDiscount(coupon, subtotal);
  cart.appliedCoupon = { code: coupon.code, discountAmount };
  await cart.save();

  const totals = calcTotals(cart);
  res.json(new ApiResponse(200, cartPayload(cart, totals)));
});

const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError(404, 'Cart not found');

  cart.appliedCoupon = undefined;
  await cart.save();

  const totals = calcTotals(cart);
  res.json(new ApiResponse(200, cartPayload(cart, totals)));
});

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
};
