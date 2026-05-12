const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    items: [
      {
        product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name:     { type: String, required: true },
        image:    { type: String },
        size:     { type: String, required: true },
        price:    { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],

    shippingAddress: {
      name:    { type: String, required: true },
      phone:   { type: String, required: true },
      street:  { type: String, required: true },
      city:    { type: String, required: true },
      state:   { type: String, required: true },
      pincode: { type: String, required: true },
    },

    pricing: {
      subtotal:       { type: Number, required: true },
      discount:       { type: Number, default: 0 },
      shippingCharge: { type: Number, default: 0 },
      total:          { type: Number, required: true },
    },

    coupon: {
      code:           { type: String },
      discountAmount: { type: Number },
    },

    paymentMethod: { type: String, enum: ['paytm', 'cod'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },

    paymentDetails: {
      paytmOrderId:  { type: String },
      transactionId: { type: String },
      paidAt:        { type: Date },
    },

    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },

    statusHistory: [
      {
        status:    { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note:      { type: String },
      },
    ],

    cancelReason: { type: String },
    deliveredAt:  { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });

orderSchema.pre('save', function (next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm   = String(date.getMonth() + 1).padStart(2, '0');
    const dd   = String(date.getDate()).padStart(2, '0');
    const rand = Array.from({ length: 4 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
    ).join('');
    this.orderNumber = `SS-${yyyy}${mm}${dd}-${rand}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
