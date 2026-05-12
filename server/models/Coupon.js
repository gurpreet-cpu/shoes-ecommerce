const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code:          { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType:  { type: String, enum: ['percentage', 'flat'], required: true },
    discountValue: { type: Number, required: true, min: 0 },

    minOrderAmount:    { type: Number, default: 0 },
    maxDiscountAmount: { type: Number },

    usageLimit: { type: Number, required: true },
    usedCount:  { type: Number, default: 0 },

    expiresAt: { type: Date, required: true },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
