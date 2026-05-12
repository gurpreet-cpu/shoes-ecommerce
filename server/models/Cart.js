const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    items: [
      {
        product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        size:     { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price:    { type: Number, required: true },
      },
    ],

    appliedCoupon: {
      code:           { type: String },
      discountAmount: { type: Number },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);
