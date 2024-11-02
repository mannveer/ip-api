import redis from 'redis';
import configs from '.';
import logger from '../utils/logger';

const redisClient = redis.createClient({
  host: configs.redis.host, // default Redis host
  port: configs.redis.port, // default Redis port
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
  console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
  console.error('Redis error:', err);
});

export default redisClient;
