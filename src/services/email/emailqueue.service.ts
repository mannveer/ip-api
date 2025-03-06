import logger from '../../utils/logger';
import EmailService from './emailService';
import { IEmailQueueJob } from '../../interfaces/email.interface';
import configs from '../../config/index';
import Bull from 'bull';

/**
 * Hybrid email queue that can switch between in-memory and Bull queue 
 * based on configuration
 */
class EmailQueue {
  private inMemoryQueue: IEmailQueueJob[];
  private processingInMemory: boolean;
  private bullQueue: Bull.Queue | null;
  private emailService: EmailService;
  
  constructor() {
    this.inMemoryQueue = [];
    this.processingInMemory = false;
    this.bullQueue = null;
    this.emailService = new EmailService();
    
    // Initialize based on configuration
    this.initialize();
  }
  
  private initialize(): void {
    if (configs.email.useRedisQueue) {
      this.initializeBullQueue();
    } else {
      logger.info('Using in-memory email queue');
      // Start the in-memory queue processor
      this.processInMemoryQueue();
    }
  }
  
  private initializeBullQueue(): void {
    try {
      this.bullQueue = new Bull('email-queue', {
        redis: {
          host: configs.redis.host,
          port: configs.redis.port,
          password: configs.redis.password
        }
      });
      
      this.bullQueue.process(async (job) => {
        const { type, data } = job.data;
        await this.processJob(type, data);
      });
      
      this.bullQueue.on('completed', (job) => {
        logger.info(`Email job ${job.id} completed`);
      });
      
      this.bullQueue.on('failed', (job, error) => {
        logger.error(`Email job ${job?.id} failed: ${error.message}`);
      });
      
      logger.info('Bull email queue initialized');
    } catch (error) {
      logger.error('Failed to initialize Bull queue, falling back to in-memory queue', error);
      this.bullQueue = null;
      this.processInMemoryQueue();
    }
  }
  
  /**
   * Add a job to the queue
   */
  public add(type: string, data: any): void {
    if (this.bullQueue) {
      this.bullQueue.add({ type, data }, { 
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      });
    } else {
      this.inMemoryQueue.push({ type, data });
      // If not already processing, start processing
      if (!this.processingInMemory) {
        this.processInMemoryQueue();
      }
    }
  }
  
  /**
   * Process the in-memory queue
   */
  private async processInMemoryQueue(): Promise<void> {
    this.processingInMemory = true;
    
    while (this.inMemoryQueue.length > 0) {
      const job = this.inMemoryQueue.shift();
      if (job) {
        try {
          await this.processJob(job.type, job.data);
          logger.info(`In-memory email job processed: ${job.type}`);
        } catch (error) {
          logger.error(`Error processing in-memory email job: ${error.message}`);
          // If failed, push it back to queue with reduced priority
          if (this.inMemoryQueue.length < 100) { // Prevent queue from growing too large
            this.inMemoryQueue.push(job);
          }
        }
      }
      
      // Small delay to prevent CPU hogging
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.processingInMemory = false;
  }
  
  /**
   * Process individual email jobs
   */
  private async processJob(type: string, data: any): Promise<void> {
    const { user, url, ...additionalData } = data;
    
    // Create a new instance for each job to prevent state sharing
    const emailService = new EmailService(user, url);
    
    switch (type) {
      case 'welcome':
        await emailService.sendWelcome(additionalData);
        break;
      case 'otp':
        await emailService.sendOTP(additionalData);
        break;
      case 'contactThanks':
        await emailService.sendContactThanks();
        break;
      default:
        throw new Error(`Unknown email job type: ${type}`);
    }
  }
}

export default new EmailQueue();
