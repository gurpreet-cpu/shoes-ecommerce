const express  = require('express');
const router   = express.Router();
const passport = require('passport');

const {
  register,
  verifyEmail,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getMe,
  googleCallback,
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

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', {
    scope:  ['profile', 'email'],
    prompt: 'select_account',
  })
);

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`,
    session:         false,
  }),
  googleCallback
);

module.exports = router;
