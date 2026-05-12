const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    rating:  { type: Number, required: true, min: 1, max: 5 },
    title:   { type: String, trim: true, maxlength: 100 },
    comment: { type: String, trim: true, maxlength: 1000 },

    isVerifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

reviewSchema.post('save', async function () {
  const Product = mongoose.model('Product');
  const result = await mongoose.model('Review').aggregate([
    { $match: { product: this.product } },
    { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (result.length > 0) {
    await Product.findByIdAndUpdate(this.product, {
      'ratings.average': Math.round(result[0].average * 10) / 10,
      'ratings.count':   result[0].count,
    });
  }
});

module.exports = mongoose.model('Review', reviewSchema);
