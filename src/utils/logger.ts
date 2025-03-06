import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import WinstonCloudwatch from 'winston-cloudwatch'; 

const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, errors, json } = format;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

const logger = createLogger({
  level: 'info', 
  format: combine(
    timestamp(),
    errors({ stack: true }), 
    logFormat 
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
  ],
  exitOnError: false
});

if (process.env.NODE_ENV === 'development') {
  logger.add(new transports.File({
    filename: path.join(__dirname, 'logs', 'error.log'),
    level: 'error',
    format: combine(
      json() 
    )
  }));

  logger.add(new transports.File({
    filename: path.join(__dirname, 'logs', 'combined.log'),
    format: combine(
      json()
    )
  }));
}

if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  logger.add(new WinstonCloudwatch({
    logGroupName: 'your-log-group', // Replace with your CloudWatch log group
    logStreamName: 'your-log-stream', // Replace with your CloudWatch log stream
    awsRegion: 'your-region' // Replace with your AWS region
  }));

  logger.clear();
  logger.add(new transports.Console({
    format: combine(
      format.colorize(),
      logFormat
    )
  }));
}

logger.infoWithMeta = function (message, meta) {
  this.log('info', message, meta);
};

logger.errorWithMeta = function (message, meta) {
  this.log('error', message, meta);
};

export default logger;