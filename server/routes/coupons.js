const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/auth');
const adminOnly       = require('../middleware/adminOnly');
const validate        = require('../middleware/validate');
const {
  createCoupon: createSchema,
  updateCoupon: updateSchema,
  validateCoupon: validateSchema,
} = require('../validators/couponValidator');
const {
  validateCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = require('../controllers/couponController');

router.post('/validate', verifyToken, validate(validateSchema), validateCoupon);

router.get('/',     verifyToken, adminOnly, getCoupons);
router.post('/',    verifyToken, adminOnly, validate(createSchema), createCoupon);
router.put('/:id',  verifyToken, adminOnly, validate(updateSchema), updateCoupon);
router.delete('/:id', verifyToken, adminOnly, deleteCoupon);

module.exports = router;
