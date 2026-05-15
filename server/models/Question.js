const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question:    { type: String, required: true, maxlength: 500, trim: true },
    answer:      { type: String, trim: true },
    answeredBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    answeredAt:  { type: Date },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

questionSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('Question', questionSchema);
