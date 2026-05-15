const express = require('express');
const router  = express.Router();

const { verifyToken }  = require('../middleware/auth');
const adminOnly        = require('../middleware/adminOnly');
const validate         = require('../middleware/validate');
const { reorderLimiter, invoiceLimiter } = require('../middleware/rateLimiter');
const { createOrder: createOrderSchema } = require('../validators/orderValidator');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  initiateRTO,
  completeRTO,
  updateRefund,
  reorderItems,
  downloadInvoice,
} = require('../controllers/orderController');

router.use(verifyToken);

router.post('/',                validate(createOrderSchema), createOrder);
router.get('/my',               getMyOrders);
router.get('/my/:id',           getOrderById);
router.post('/my/:id/cancel',   cancelOrder);
router.post('/my/:id/reorder',  reorderLimiter, reorderItems);
router.get('/my/:id/invoice',   invoiceLimiter, downloadInvoice);

// Admin-only order operations
router.put('/:id/rto',          adminOnly, initiateRTO);
router.put('/:id/rto/complete', adminOnly, completeRTO);
router.put('/:id/refund',       adminOnly, updateRefund);
// Admin invoice download (any order)
router.get('/:id/invoice',      adminOnly, invoiceLimiter, downloadInvoice);

module.exports = router;
