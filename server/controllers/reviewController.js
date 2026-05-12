const { isValidObjectId } = require('mongoose');
const Review  = require('../models/Review');
const Order   = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const ApiResponse  = require('../utils/ApiResponse');

// ── POST /api/reviews/products/:productId ─────────────────────────────────────
const addReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!isValidObjectId(productId)) throw new ApiError(400, 'Invalid product ID');

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new ApiError(404, 'Product not found');

  // Only verified buyers can review
  const hasPurchase = await Order.findOne({
    user:        req.user._id,
    orderStatus: 'delivered',
    'items.product': productId,
  });
  if (!hasPurchase) throw new ApiError(403, 'You can only review products you have purchased and received');

  const { rating, title, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) throw new ApiError(400, 'Rating must be between 1 and 5');

  const review = await Review.create({
    product:            productId,
    user:               req.user._id,
    rating:             Number(rating),
    title,
    comment,
    isVerifiedPurchase: true,
  });

  res.status(201).json(new ApiResponse(201, { review }, 'Review added'));
});

// ── GET /api/reviews/products/:productId ─────────────────────────────────────
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!isValidObjectId(productId)) throw new ApiError(400, 'Invalid product ID');

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const skip  = (page - 1) * limit;

  const [reviews, totalCount] = await Promise.all([
    Review.find({ product: productId })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    Review.countDocuments({ product: productId }),
  ]);

  const product = await Product.findById(productId).select('ratings');

  res.json(new ApiResponse(200, {
    reviews,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
    averageRating: product?.ratings?.average || 0,
    ratingCount:   product?.ratings?.count   || 0,
  }));
});

// ── DELETE /api/reviews/:reviewId ─────────────────────────────────────────────
const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  if (!isValidObjectId(reviewId)) throw new ApiError(400, 'Invalid review ID');

  const review = await Review.findById(reviewId);
  if (!review) throw new ApiError(404, 'Review not found');

  const isOwner = review.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) throw new ApiError(403, 'Not authorized to delete this review');

  const productId = review.product;
  await review.deleteOne();

  // Recalculate product rating
  const { default: mongoose } = require('mongoose');
  const result = await mongoose.model('Review').aggregate([
    { $match: { product: productId } },
    { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.findByIdAndUpdate(productId, {
    'ratings.average': result[0] ? Math.round(result[0].average * 10) / 10 : 0,
    'ratings.count':   result[0]?.count || 0,
  });

  res.json(new ApiResponse(200, null, 'Review deleted'));
});

module.exports = { addReview, getProductReviews, deleteReview };
