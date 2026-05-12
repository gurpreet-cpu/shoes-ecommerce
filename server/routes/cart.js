const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/auth');
const {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
} = require('../controllers/cartController');

router.use(verifyToken);

router.get('/',           getCart);
router.post('/items',     addItem);
router.put('/items',      updateItem);
router.delete('/items',   removeItem);
router.delete('/',        clearCart);
router.post('/coupon',    applyCoupon);
router.delete('/coupon',  removeCoupon);

module.exports = router;
