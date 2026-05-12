const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/auth');
const { addReview, getProductReviews, deleteReview } = require('../controllers/reviewController');

router.post('/products/:productId',  verifyToken, addReview);
router.get('/products/:productId',   getProductReviews);
router.delete('/:reviewId',          verifyToken, deleteReview);

module.exports = router;
