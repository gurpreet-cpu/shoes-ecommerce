const express = require('express');
const router = express.Router();

const { verifyToken }          = require('../middleware/auth');
const adminOnly                = require('../middleware/adminOnly');
const { uploadProductImages }  = require('../middleware/upload');
const {
  createProduct,
  getProducts,
  getProductBySlug,
  getProductById,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  updateStock,
  searchProducts,
} = require('../controllers/productController');

// Public
router.get('/',              getProducts);
router.get('/featured',      getFeaturedProducts);
router.get('/search',        searchProducts);
router.get('/slug/:slug',    getProductBySlug);
router.get('/:id',           getProductById);

// Admin only
router.post('/',             verifyToken, adminOnly, uploadProductImages, createProduct);
router.put('/:id',           verifyToken, adminOnly, uploadProductImages, updateProduct);
router.delete('/:id',        verifyToken, adminOnly, deleteProduct);
router.put('/:id/stock',     verifyToken, adminOnly, updateStock);

module.exports = router;
