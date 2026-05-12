const Coupon = require('../models/Coupon');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// Shared logic: compute discount amount from a coupon + subtotal
function computeDiscount(coupon, subtotal) {
  let discount;
  if (coupon.discountType === 'percentage') {
    discount = (subtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }
  } else {
    discount = Math.min(coupon.discountValue, subtotal);
  }
  return Math.round(discount * 100) / 100;
}

async function findValidCoupon(code) {
  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true,
    expiresAt: { $gt: new Date() },
  });
  if (!coupon) throw new ApiError(400, 'Invalid or expired coupon');
  if (coupon.usedCount >= coupon.usageLimit) throw new ApiError(400, 'Coupon usage limit reached');
  return coupon;
}

// POST /api/coupons/validate — preview discount without applying to cart
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, cartTotal } = req.body;

  const coupon = await findValidCoupon(code);

  if (cartTotal < coupon.minOrderAmount) {
    throw new ApiError(400, `Minimum order ₹${coupon.minOrderAmount} required for this coupon`);
  }

  const discountAmount = computeDiscount(coupon, cartTotal);
  const finalTotal = cartTotal - discountAmount;

  res.json(
    new ApiResponse(200, {
      valid: true,
      discountAmount,
      finalTotal,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    })
  );
});

// GET /api/coupons — admin list
const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json(new ApiResponse(200, coupons));
});

// POST /api/coupons — admin create
const createCoupon = asyncHandler(async (req, res) => {
  const existing = await Coupon.findOne({ code: req.body.code.toUpperCase() });
  if (existing) throw new ApiError(409, 'Coupon code already exists');

  const coupon = await Coupon.create({ ...req.body, code: req.body.code.toUpperCase() });
  res.status(201).json(new ApiResponse(201, coupon, 'Coupon created'));
});

// PUT /api/coupons/:id — admin update
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');

  if (req.body.code) req.body.code = req.body.code.toUpperCase();
  Object.assign(coupon, req.body);
  await coupon.save();

  res.json(new ApiResponse(200, coupon, 'Coupon updated'));
});

// DELETE /api/coupons/:id — admin delete (hard delete is fine for coupons)
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  res.json(new ApiResponse(200, null, 'Coupon deleted'));
});

module.exports = {
  validateCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  findValidCoupon,
  computeDiscount,
};
