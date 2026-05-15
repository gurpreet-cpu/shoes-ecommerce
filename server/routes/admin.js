const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/auth');
const adminOnly       = require('../middleware/adminOnly');
const adminLogger     = require('../middleware/adminLogger');
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
  exportOrders,
  getCustomerProfile,
  bulkUpdateOrderStatus,
  adminSearch,
  addAdminNote,
  getInventory,
  updateInventory,
  cleanupExpiredPaymentsRoute,
} = require('../controllers/adminController');

// All admin routes require a valid JWT + admin role + action logging
router.use(verifyToken, adminOnly, adminLogger);

// Dashboard & analytics
router.get('/dashboard',                      getDashboard);
router.get('/analytics/revenue',              getRevenueAnalytics);
router.get('/analytics/products',             getProductAnalytics);

// Search
router.get('/search',                         adminSearch);

// Orders
router.get('/orders',                         getAllOrders);
router.get('/orders/export',                  exportOrders);
router.post('/orders/bulk-status',            bulkUpdateOrderStatus);
router.get('/orders/:id',                     getOrderDetail);
router.put('/orders/:id/status',              updateOrderStatus);
router.put('/orders/:id/note',                addAdminNote);

// Users
router.get('/users',                          getAllUsers);
router.get('/customers/:id',                  getCustomerProfile);
router.put('/users/:id/role',                 updateUserRole);
router.delete('/users/:id',                   deactivateUser);

// Inventory
router.get('/inventory',                      getInventory);
router.put('/inventory/:productId',           updateInventory);

// Maintenance
router.post('/cleanup/expired-payments',      cleanupExpiredPaymentsRoute);

module.exports = router;
