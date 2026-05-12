const express = require('express');
const router  = express.Router();

const { verifyToken }    = require('../middleware/auth');
const adminOnly          = require('../middleware/adminOnly');
const { paymentLimiter } = require('../middleware/rateLimiter');
const {
  initiatePaytmPayment,
  paytmCallback,
  getPaymentStatus,
  confirmCOD,
} = require('../controllers/paymentController');

router.post('/paytm/initiate',         verifyToken, paymentLimiter, initiatePaytmPayment);
router.post('/paytm/callback',         paytmCallback);  // no auth — Paytm posts here
router.get('/paytm/status/:orderId',   verifyToken, getPaymentStatus);
router.put('/cod/confirm/:orderId',    verifyToken, adminOnly, confirmCOD);

module.exports = router;
