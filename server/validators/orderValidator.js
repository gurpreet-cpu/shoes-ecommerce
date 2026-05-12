const Joi = require('joi');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid product ID');

const createOrder = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: objectId.required(),
        size:      Joi.string().required(),
        quantity:  Joi.number().integer().min(1).max(10).required(),
      })
    )
    .min(1)
    .required(),

  shippingAddress: Joi.object({
    name:    Joi.string().required(),
    phone:   Joi.string().pattern(/^\d{10}$/).message('Phone must be 10 digits').required(),
    street:  Joi.string().required(),
    city:    Joi.string().required(),
    state:   Joi.string().required(),
    pincode: Joi.string().pattern(/^\d{6}$/).message('Pincode must be 6 digits').required(),
  }).required(),

  paymentMethod: Joi.string().valid('paytm', 'cod').required(),
  couponCode:    Joi.string().uppercase().optional(),
});

module.exports = { createOrder };
