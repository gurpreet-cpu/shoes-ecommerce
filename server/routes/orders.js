const express = require('express');
const router  = express.Router();

const { verifyToken }  = require('../middleware/auth');
const validate         = require('../middleware/validate');
const { createOrder: createOrderSchema } = require('../validators/orderValidator');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
} = require('../controllers/orderController');

router.use(verifyToken);

router.post('/',           validate(createOrderSchema), createOrder);
router.get('/',            getMyOrders);
router.get('/:id',         getOrderById);
router.put('/:id/cancel',  cancelOrder);

module.exports = router;
