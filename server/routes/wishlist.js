const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/auth');
const { wishlistLimiter } = require('../middleware/rateLimiter');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkInWishlist,
} = require('../controllers/wishlistController');

router.use(verifyToken, wishlistLimiter);

router.get('/',                    getWishlist);
router.post('/',                   addToWishlist);
router.delete('/:productId',       removeFromWishlist);
router.get('/check/:productId',    checkInWishlist);

module.exports = router;
