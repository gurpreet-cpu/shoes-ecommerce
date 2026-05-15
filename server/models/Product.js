const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, unique: true },
    description: { type: String, trim: true },
    brand:       { type: String, trim: true },

    category:    { type: String, enum: ['mens', 'womens'], required: true },
    subCategory: { type: String, enum: ['casual', 'sports', 'formal', 'sandals', 'boots'], required: true },

    images: [
      {
        url:      { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    price:         { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },

    sizes: [
      {
        size:  { type: String, required: true },
        stock: { type: Number, default: 0, min: 0 },
      },
    ],

    color:    { type: String, trim: true },
    material: { type: String, trim: true },
    tags:     [{ type: String }],

    ratings: {
      average: { type: Number, default: 0 },
      count:   { type: Number, default: 0 },
    },

    isFeatured:        { type: Boolean, default: false },
    isActive:          { type: Boolean, default: true },
    lowStockThreshold: { type: Number, default: 3 },
    totalSold:         { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', brand: 'text', tags: 'text' });
productSchema.index({ category: 1, subCategory: 1 });
productSchema.index({ isFeatured: 1 });

productSchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
