import nodemailer from 'nodemailer';
import configs from '../../config/index';
import logger from '../../utils/logger';
import { IEmailTransport } from '../../interfaces/email.interface';

// Cached transport for reuse
let cachedTransport: any = null;
let lastCreatedTime: number = 0;
const TRANSPORT_LIFETIME = 1000 * 60 * 30; // 30 minutes

const createTransport: IEmailTransport['createTransport'] = async () => {
  const currentTime = Date.now();
  
  // Return cached transport if it exists and is still valid
  if (cachedTransport && (currentTime - lastCreatedTime < TRANSPORT_LIFETIME)) {
    return cachedTransport;
  }
  
  try {
    // Create a new transport
    const newTransport = nodemailer.createTransport({
      host: configs.email.emailHost,
      port: configs.email.emailPort,
      secure: configs.email.secure || false,
      auth: {
        user: configs.email.emailUsername,
        pass: configs.email.emailPassword
      },
      pool: true, // Use connection pool
      maxConnections: 5, // Maximum number of connections
      maxMessages: 100, // Maximum number of messages per connection
      rateLimit: 10 // Max messages per second
    });
    
    // Verify connection
    await newTransport.verify();
    
    // Update cache
    cachedTransport = newTransport;
    lastCreatedTime = currentTime;
    
    logger.info('Email transport created and verified');
    return newTransport;
  } catch (error) {
    logger.error('Failed to create email transport:', error);
    throw new Error('Email service unavailable');
  }
};

export default createTransport;
