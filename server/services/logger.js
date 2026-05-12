const { createLogger, format, transports } = require('winston');
const path = require('path');

const { combine, timestamp, colorize, printf, errors } = format;

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) =>
    stack ? `${timestamp} ${level}: ${message}\n${stack}` : `${timestamp} ${level}: ${message}`
  )
);

const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  format.json()
);

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports: [
    new transports.Console({ format: consoleFormat }),
    new transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: fileFormat,
    }),
    new transports.File({
      filename: path.join('logs', 'combined.log'),
      format: fileFormat,
    }),
  ],
});

module.exports = logger;
