const mongoose = require('mongoose');
const logger = require('../services/logger');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

const connectDB = async (retries = 0) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    if (retries < MAX_RETRIES) {
      logger.error(`MongoDB connection failed (attempt ${retries + 1}/${MAX_RETRIES}): ${err.message}`);
      logger.info(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      setTimeout(() => connectDB(retries + 1), RETRY_DELAY_MS);
    } else {
      logger.error('MongoDB connection failed after maximum retries. Exiting.');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
