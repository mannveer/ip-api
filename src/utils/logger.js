import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import WinstonCloudwatch from 'winston-cloudwatch'; // For cloud-based logging like AWS

const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, errors, json } = format;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define custom formats
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

// Create logger
const logger = createLogger({
  level: 'info', // Default level, can be changed dynamically
  format: combine(
    timestamp(),
    errors({ stack: true }), // Capture stack traces in error logs
    logFormat // Custom log format
  ),
  transports: [
    new transports.Console({
      format: combine(
        format.colorize(),
        logFormat
      )
    })
  ],
  exceptionHandlers: [
    new transports.Console({
      format: combine(
        format.colorize(),
        logFormat
      )
    })
  ],
  rejectionHandlers: [
    new transports.Console({
      format: combine(
        format.colorize(),
        logFormat
      )
    })
  ]
});

// For local development, add file logging
if (process.env.NODE_ENV === 'development') {
  logger.add(new transports.File({
    filename: path.join(__dirname, 'logs', 'error.log'),
    level: 'error',
    format: combine(
      json() // Store error logs in JSON format for better parsing
    )
  }));

  logger.add(new transports.File({
    filename: path.join(__dirname, 'logs', 'combined.log'),
    format: combine(
      json() // Store logs in JSON format
    )
  }));
}

// For production, use cloud-based logging or handle other production strategies
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  logger.add(new WinstonCloudwatch({
    logGroupName: 'your-log-group', // Replace with your CloudWatch log group
    logStreamName: 'your-log-stream', // Replace with your CloudWatch log stream
    awsRegion: 'your-region' // Replace with your AWS region
  }));

  // Optionally remove file-based transports in production
  logger.clear();
  logger.add(new transports.Console({
    format: combine(
      format.colorize(),
      logFormat
    )
  }));
}

// Example helper functions for structured logging
logger.infoWithMeta = function (message, meta) {
  this.log('info', message, meta);
};

logger.errorWithMeta = function (message, meta) {
  this.log('error', message, meta);
};

export default logger;
