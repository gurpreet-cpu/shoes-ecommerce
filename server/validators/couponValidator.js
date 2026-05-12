const Joi = require('joi');

const createCoupon = Joi.object({
  code:              Joi.string().alphanum().min(3).max(20).uppercase().required(),
  discountType:      Joi.string().valid('percentage', 'flat').required(),
  discountValue:     Joi.number().min(1).required(),
  minOrderAmount:    Joi.number().min(0).default(0),
  maxDiscountAmount: Joi.number().min(0).when('discountType', {
    is: 'percentage',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  usageLimit: Joi.number().integer().min(1).required(),
  expiresAt:  Joi.date().greater('now').required(),
  isActive:   Joi.boolean().default(true),
});

const updateCoupon = Joi.object({
  code:              Joi.string().alphanum().min(3).max(20).uppercase().optional(),
  discountType:      Joi.string().valid('percentage', 'flat').optional(),
  discountValue:     Joi.number().min(1).optional(),
  minOrderAmount:    Joi.number().min(0).optional(),
  maxDiscountAmount: Joi.number().min(0).optional(),
  usageLimit:        Joi.number().integer().min(1).optional(),
  expiresAt:         Joi.date().greater('now').optional(),
  isActive:          Joi.boolean().optional(),
});

const validateCoupon = Joi.object({
  code:      Joi.string().required(),
  cartTotal: Joi.number().min(0).required(),
});

module.exports = { createCoupon, updateCoupon, validateCoupon };
