const Order   = require('../models/Order');
const Cart    = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const ApiResponse  = require('../utils/ApiResponse');
const { buildPaytmParams, verifyChecksum, initiateTransaction } = require('../services/paytmService');
const logger       = require('../services/logger');
const {
  sendPaymentConfirmedEmail,
  sendPaymentFailedEmail,
  sendOrderStatusEmail,
} = require('../services/emailService');

// ── POST /api/payment/paytm/initiate ─────────────────────────────────────────
const initiatePaytmPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) throw new ApiError(400, 'orderId is required');

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.paymentMethod !== 'paytm') throw new ApiError(400, 'Order payment method is not Paytm');
  if (order.paymentStatus === 'paid') throw new ApiError(400, 'Order is already paid');

  const params     = buildPaytmParams(order);
  params.EMAIL     = req.user.email;
  params.MOBILE_NO = req.user.phone || '';

  let txnToken;
  try {
    txnToken = await initiateTransaction(params);
  } catch (err) {
    throw new ApiError(502, `Paytm initiation failed: ${err.message}`);
  }

  order.paymentDetails = { ...order.paymentDetails, paytmOrderId: order.orderNumber };
  await order.save();

  res.json(
    new ApiResponse(200, {
      txnToken,
      orderId: order.orderNumber,
      amount:  Number(order.pricing.total).toFixed(2),
      mid:     process.env.PAYTM_MID,
    })
  );
});

// ── POST /api/payment/paytm/callback — called by Paytm, NO auth ──────────────
const paytmCallback = asyncHandler(async (req, res) => {
  const params   = { ...req.body };
  const checksum = params.CHECKSUMHASH;
  delete params.CHECKSUMHASH;

  // CRITICAL — hard reject on checksum failure, never process
  const isValid = await verifyChecksum(params, checksum);
  if (!isValid) {
    logger.warn(`[Paytm Callback] Checksum MISMATCH — possible fraud. ORDERID: ${params.ORDERID}`);
    return res.status(400).json({ message: 'Invalid checksum' });
  }

  const order = await Order.findOne({ orderNumber: params.ORDERID }).populate('user', 'name email phone');
  if (!order) {
    logger.warn(`[Paytm Callback] Order not found for ORDERID: ${params.ORDERID}`);
    return res.status(200).json({ message: 'Order not found' });
  }

  // Guard against double-processing (idempotent)
  if (order.paymentStatus === 'paid') {
    logger.info(`[Paytm Callback] Duplicate callback for already-paid order: ${params.ORDERID}`);
    return res.status(200).json({ message: 'Already processed' });
  }

  if (params.STATUS === 'TXN_SUCCESS') {
    order.paymentStatus  = 'paid';
    order.orderStatus    = 'confirmed';
    order.paymentDetails = {
      paytmOrderId:  params.ORDERID,
      transactionId: params.TXNID,
      paidAt:        new Date(),
    };
    order.statusHistory.push({
      status:    'confirmed',
      timestamp: new Date(),
      note:      'Payment confirmed via Paytm',
    });
    await order.save();

    await Cart.findOneAndUpdate(
      { user: order.user._id },
      { items: [], appliedCoupon: undefined }
    );
    logger.info(`[Paytm Callback] Payment successful for order: ${params.ORDERID}, txn: ${params.TXNID}`);
    sendPaymentConfirmedEmail(order.user, order).catch(() => {});

  } else {
    // Restore stock on payment failure
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product, 'sizes.size': item.size },
        { $inc: { 'sizes.$.stock': item.quantity } }
      );
    }
    order.paymentStatus = 'failed';
    order.statusHistory.push({
      status:    'pending',
      timestamp: new Date(),
      note:      `Payment failed: ${params.RESPMSG || 'Unknown reason'}`,
    });
    await order.save();

    sendPaymentFailedEmail(order.user, order).catch(() => {});
  }

  res.status(200).json({ message: 'Callback processed' });
});

// ── GET /api/payment/paytm/status/:orderId ────────────────────────────────────
const getPaymentStatus = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id })
    .select('orderNumber paymentStatus orderStatus paymentDetails');
  if (!order) throw new ApiError(404, 'Order not found');

  res.json(
    new ApiResponse(200, {
      paymentStatus: order.paymentStatus,
      orderStatus:   order.orderStatus,
      transactionId: order.paymentDetails?.transactionId || null,
      orderNumber:   order.orderNumber,
    })
  );
});

// ── PUT /api/payment/cod/confirm/:orderId — admin only ────────────────────────
const confirmCOD = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId).populate('user', 'name email phone');
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.paymentMethod !== 'cod') throw new ApiError(400, 'Not a COD order');
  if (order.orderStatus !== 'pending') throw new ApiError(400, 'Order already processed');

  order.orderStatus = 'confirmed';
  order.statusHistory.push({
    status:    'confirmed',
    timestamp: new Date(),
    note:      'COD confirmed by admin',
  });
  await order.save();

  sendOrderStatusEmail(order.user, order, 'confirmed').catch(() => {});

  res.json(new ApiResponse(200, { order }, 'COD order confirmed'));
});

module.exports = { initiatePaytmPayment, paytmCallback, getPaymentStatus, confirmCOD };
