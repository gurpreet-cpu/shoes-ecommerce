const Joi = require('joi');

const sizeEntry = Joi.object({
  size:  Joi.string().required(),
  stock: Joi.number().integer().min(0).default(0),
});

const createProduct = Joi.object({
  name:          Joi.string().min(2).max(100).required(),
  description:   Joi.string().min(10).max(2000).required(),
  brand:         Joi.string().required(),
  category:      Joi.string().valid('mens', 'womens').required(),
  subCategory:   Joi.string().valid('casual', 'sports', 'formal', 'sandals', 'boots').required(),
  price:         Joi.number().min(1).required(),
  discountPrice: Joi.number().min(0).optional(),
  sizes:         Joi.array().items(sizeEntry).min(1).required(),
  color:         Joi.string().optional(),
  material:      Joi.string().optional(),
  tags:          Joi.array().items(Joi.string()).optional(),
  isFeatured:    Joi.boolean().optional(),
}).custom((value, helpers) => {
  if (value.discountPrice !== undefined && value.discountPrice >= value.price) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'discountPrice < price check');

const updateProduct = Joi.object({
  name:          Joi.string().min(2).max(100).optional(),
  description:   Joi.string().min(10).max(2000).optional(),
  brand:         Joi.string().optional(),
  category:      Joi.string().valid('mens', 'womens').optional(),
  subCategory:   Joi.string().valid('casual', 'sports', 'formal', 'sandals', 'boots').optional(),
  price:         Joi.number().min(1).optional(),
  discountPrice: Joi.number().min(0).optional().allow(null),
  sizes:         Joi.array().items(sizeEntry).min(1).optional(),
  color:         Joi.string().optional(),
  material:      Joi.string().optional(),
  tags:          Joi.array().items(Joi.string()).optional(),
  isFeatured:    Joi.boolean().optional(),
  isActive:      Joi.boolean().optional(),
});

const productQuery = Joi.object({
  category:    Joi.string().valid('mens', 'womens').optional(),
  subCategory: Joi.string().valid('casual', 'sports', 'formal', 'sandals', 'boots').optional(),
  brand:       Joi.string().optional(),
  color:       Joi.string().optional(),
  minPrice:    Joi.number().min(0).optional(),
  maxPrice:    Joi.number().min(0).optional(),
  isFeatured:  Joi.boolean().optional(),
  search:      Joi.string().optional(),
  page:        Joi.number().integer().min(1).default(1),
  limit:       Joi.number().integer().min(1).max(50).default(12),
  sortBy:      Joi.string().valid('price_asc', 'price_desc', 'newest', 'rating').default('newest'),
});

const updateStock = Joi.object({
  sizes: Joi.array().items(sizeEntry).min(1).required(),
});

module.exports = { createProduct, updateProduct, productQuery, updateStock };
