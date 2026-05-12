const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const User = require('../models/User');

// ── getProfile ────────────────────────────────────────────────────────────────
const getProfile = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, { user: req.user }));
});

// ── updateProfile ─────────────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { ...(name && { name }), ...(phone && { phone }) },
    { new: true, runValidators: true }
  ).select('-password -refreshToken -__v');

  res.json(new ApiResponse(200, { user }, 'Profile updated'));
});

// ── addAddress ────────────────────────────────────────────────────────────────
const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.addresses.length >= 5) {
    throw new ApiError(400, 'Maximum 5 addresses allowed');
  }

  const { label, street, city, state, pincode, isDefault } = req.body;

  if (isDefault) {
    user.addresses.forEach((a) => { a.isDefault = false; });
  }

  user.addresses.push({ label, street, city, state, pincode, isDefault: !!isDefault });
  await user.save();

  res.status(201).json(new ApiResponse(201, { addresses: user.addresses }, 'Address added'));
});

// ── updateAddress ─────────────────────────────────────────────────────────────
const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const addr = user.addresses.id(req.params.addressId);
  if (!addr) throw new ApiError(404, 'Address not found');

  const { label, street, city, state, pincode, isDefault } = req.body;

  if (isDefault) {
    user.addresses.forEach((a) => { a.isDefault = false; });
  }

  if (label    !== undefined) addr.label    = label;
  if (street   !== undefined) addr.street   = street;
  if (city     !== undefined) addr.city     = city;
  if (state    !== undefined) addr.state    = state;
  if (pincode  !== undefined) addr.pincode  = pincode;
  if (isDefault !== undefined) addr.isDefault = !!isDefault;

  await user.save();
  res.json(new ApiResponse(200, { addresses: user.addresses }, 'Address updated'));
});

// ── deleteAddress ─────────────────────────────────────────────────────────────
const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const addr = user.addresses.id(req.params.addressId);
  if (!addr) throw new ApiError(404, 'Address not found');

  addr.deleteOne();
  await user.save();

  res.json(new ApiResponse(200, { addresses: user.addresses }, 'Address deleted'));
});

// ── changePassword ────────────────────────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new ApiError(401, 'Current password is incorrect');

  user.password = await bcrypt.hash(newPassword, 12);
  user.refreshToken = undefined;
  await user.save();

  res.json(new ApiResponse(200, null, 'Password changed, please login again'));
});

module.exports = { getProfile, updateProfile, addAddress, updateAddress, deleteAddress, changePassword };
