const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label:     { type: String, trim: true },
  street:    { type: String, trim: true },
  city:      { type: String, trim: true },
  state:     { type: String, trim: true },
  pincode:   { type: String, trim: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone:    { type: String, trim: true },
    role:     { type: String, enum: ['user', 'admin'], default: 'user' },

    addresses: [addressSchema],

    refreshToken: { type: String, select: false },

    passwordResetToken:   { type: String },
    passwordResetExpires: { type: Date },

    isEmailVerified:      { type: Boolean, default: false },
    emailVerificationToken: { type: String },

    isActive:    { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
