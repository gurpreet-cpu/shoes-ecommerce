const logger = require('../services/logger');

const adminLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('[AdminAction]', {
      adminId:  req.user?._id,
      method:   req.method,
      path:     req.path,
      targetId: req.params?.id || null,
      status:   res.statusCode,
      ip:       req.ip,
      ms:       Date.now() - start,
      ts:       new Date().toISOString(),
    });
  });
  next();
};

module.exports = adminLogger;
