const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');
const User = require('../models/User');
const { sendWelcomeEmail, sendPasswordResetEmail, sendNewUserAdminEmail } = require('../services/emailService');
const logger = require('../services/logger');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
};

// ── register ─────────────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already in use');

  const hashed = await bcrypt.hash(password, 12);
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');

  const user = await User.create({
    name,
    email,
    password: hashed,
    phone,
    emailVerificationToken,
  });

  await sendWelcomeEmail(user, emailVerificationToken);
  sendNewUserAdminEmail(user).catch((err) => logger.error('Admin new user email failed:', err));

  res.status(201).json(new ApiResponse(201, null, 'Registration successful, please verify your email'));
});

// ── verifyEmail ───────────────────────────────────────────────────────────────
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw new ApiError(400, 'Verification token required');

  const user = await User.findOne({ emailVerificationToken: token });
  if (!user) throw new ApiError(400, 'Invalid or already used verification token');

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();

  res.status(200).json(new ApiResponse(200, null, 'Email verified successfully'));
});

// ── login ─────────────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid credentials');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, 'Invalid credentials');

  if (user.isActive === false) throw new ApiError(401, 'Account deactivated');

  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  user.lastLoginAt = new Date();
  await user.save();

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  res.status(200).json(
    new ApiResponse(200, {
      accessToken,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    })
  );
});

// ── logout ────────────────────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: '' } });

  res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

// ── refreshToken ──────────────────────────────────────────────────────────────
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token required');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findOne({ _id: decoded.id }).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw new ApiError(401, 'Refresh token reuse detected or invalid');
  }

  const newAccessToken  = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = newRefreshToken;
  await user.save();

  res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
  res.status(200).json(new ApiResponse(200, { accessToken: newAccessToken }));
});

// ── forgotPassword ────────────────────────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  // Always respond the same regardless of whether the email exists
  if (user) {
    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetToken   = hashedToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    await sendPasswordResetEmail(user, rawToken);
  }

  res.status(200).json(new ApiResponse(200, null, 'If that email exists, a password reset link has been sent'));
});

// ── resetPassword ─────────────────────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw new ApiError(400, 'Reset token required');

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken:   hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) throw new ApiError(400, 'Invalid or expired reset token');

  user.password             = await bcrypt.hash(req.body.password, 12);
  user.passwordResetToken   = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken         = undefined;
  await user.save();

  res.status(200).json(new ApiResponse(200, null, 'Password reset successful'));
});

// ── getMe ─────────────────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { user: req.user }));
});

// ── googleCallback ────────────────────────────────────────────────────────────
const googleCallback = asyncHandler(async (req, res) => {
  const user = req.user;

  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  res.redirect(
    `${process.env.CLIENT_URL}/auth/google/success?token=${accessToken}&userId=${user._id}`
  );
});

module.exports = {
  register,
  verifyEmail,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getMe,
  googleCallback,
};
