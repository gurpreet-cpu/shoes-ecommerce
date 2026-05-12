const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  changePassword,
} = require('../controllers/userController');
const { changePasswordSchema } = require('../validators/authValidator');
const Joi = require('joi');

const updateProfileSchema = Joi.object({
  name:  Joi.string().min(2).max(50),
  phone: Joi.string().pattern(/^\d{10}$/).message('Phone must be 10 digits'),
}).min(1);

router.use(verifyToken);

router.get('/profile',                   getProfile);
router.put('/profile',                   validate(updateProfileSchema), updateProfile);
router.post('/addresses',                addAddress);
router.put('/addresses/:addressId',      updateAddress);
router.delete('/addresses/:addressId',   deleteAddress);
router.put('/change-password',           validate(changePasswordSchema), changePassword);

module.exports = router;
