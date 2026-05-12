const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/auth');
const adminOnly       = require('../middleware/adminOnly');
const {
  getDashboard,
  getAllOrders,
  getOrderDetail,
  updateOrderStatus,
  getAllUsers,
  updateUserRole,
  deactivateUser,
  getRevenueAnalytics,
  getProductAnalytics,
} = require('../controllers/adminController');

// All admin routes require a valid JWT + admin role
router.use(verifyToken, adminOnly);

router.get('/dashboard',              getDashboard);
router.get('/orders',                 getAllOrders);
router.get('/orders/:id',             getOrderDetail);
router.put('/orders/:id/status',      updateOrderStatus);
router.get('/users',                  getAllUsers);
router.put('/users/:id/role',         updateUserRole);
router.delete('/users/:id',           deactivateUser);
router.get('/analytics/revenue',      getRevenueAnalytics);
router.get('/analytics/products',     getProductAnalytics);

module.exports = router;
