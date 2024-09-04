import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// Destructure properties from the default export of 'winston'
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, json, errors } = format;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define custom formats
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

// Create the logger
const logger = createLogger({
  level: 'info',  // Default log level, can be changed dynamically
  format: combine(
    timestamp(), // Add timestamp to logs
    errors({ stack: true }), // Handle errors and print stack trace
    logFormat // Apply custom log format
  ),
  transports: [
    new transports.Console({
      format: combine(
        format.colorize(), // Colorize output to console
        logFormat
      )
    }),
    new transports.File({
      filename: path.join(__dirname, 'logs', 'error.log'),
      level: 'error',  // Log errors to a specific file
      format: combine(
        json()  // Store logs in JSON format for structured logging
      )
    }),
    new transports.File({
      filename: path.join(__dirname, 'logs', 'combined.log'),
      format: combine(
        json()  // Store logs in JSON format for structured logging
      )
    })
  ],
  exceptionHandlers: [
    new transports.File({
      filename: path.join(__dirname, 'logs', 'exceptions.log'),
      format: combine(
        json()  // Handle uncaught exceptions
      )
    })
  ],
  rejectionHandlers: [
    new transports.File({
      filename: path.join(__dirname, 'logs', 'rejections.log'),
      format: combine(
        json()  // Handle unhandled promise rejections
      )
    })
  ]
});

// Change log level dynamically if needed (e.g., from environment variables)
if (process.env.NODE_ENV === 'development') {
  logger.level = 'debug';  // More verbose logging in development mode
}

// Helper function for structured logs
logger.infoWithMeta = function (message, meta) {
  this.log('info', message, meta);
};

logger.errorWithMeta = function (message, meta) {
  this.log('error', message, meta);
};

export default logger;
