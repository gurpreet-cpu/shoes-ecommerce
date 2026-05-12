const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const details = error.details.map((d) => d.message);
    throw new ApiError(400, 'Validation failed', details);
  }
  next();
};

module.exports = validate;
