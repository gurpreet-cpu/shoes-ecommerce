const Wishlist = require('../models/Wishlist');
const Product  = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const ApiResponse  = require('../utils/ApiResponse');

const PRODUCT_FIELDS = 'name slug images price discountPrice ratings sizes isActive';

// ── GET /api/wishlist ─────────────────────────────────────────────────────────
const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id })
    .populate({ path: 'products.product', select: PRODUCT_FIELDS });

  if (!wishlist) {
    return res.json(new ApiResponse(200, { items: [], count: 0 }));
  }

  // Filter out inactive/deleted products
  const items = wishlist.products
    .filter((wp) => wp.product && wp.product.isActive)
    .map((wp) => ({ product: wp.product, addedAt: wp.addedAt }));

  res.json(new ApiResponse(200, { items, count: items.length }));
});

// ── POST /api/wishlist ────────────────────────────────────────────────────────
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw new ApiError(400, 'productId is required');

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new ApiError(404, 'Product not found');

  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $addToSet: { products: { product: productId, addedAt: new Date() } } },
    { upsert: true, new: true }
  );

  res.json(new ApiResponse(200, { count: wishlist.products.length }, 'Added to wishlist'));
});

// ── DELETE /api/wishlist/:productId ───────────────────────────────────────────
const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { products: { product: req.params.productId } } },
    { new: true }
  );

  const count = wishlist ? wishlist.products.length : 0;
  res.json(new ApiResponse(200, { count }, 'Removed from wishlist'));
});

// ── GET /api/wishlist/check/:productId ───────────────────────────────────────
const checkInWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({
    user:               req.user._id,
    'products.product': req.params.productId,
  });

  res.json(new ApiResponse(200, { inWishlist: !!wishlist }));
});

module.exports = { getWishlist, addToWishlist, removeFromWishlist, checkInWishlist };
