const express = require('express');
const router  = express.Router();

const {
  register,
  verifyEmail,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getMe,
} = require('../controllers/authController');

const { verifyToken }  = require('../middleware/auth');
const validate         = require('../middleware/validate');
const { authLimiter }  = require('../middleware/rateLimiter');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/authValidator');

router.post('/register',         authLimiter, validate(registerSchema),        register);
router.post('/login',            authLimiter, validate(loginSchema),            login);
router.post('/logout',           verifyToken,                                   logout);
router.post('/refresh',                                                          refreshToken);
router.get( '/verify-email',                                                     verifyEmail);
router.post('/forgot-password',  authLimiter, validate(forgotPasswordSchema),   forgotPassword);
router.post('/reset-password',               validate(resetPasswordSchema),     resetPassword);
router.get( '/me',               verifyToken,                                   getMe);

module.exports = router;
