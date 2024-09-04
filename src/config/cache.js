import redis from 'redis';

const redisClient = redis.createClient({
  host: 'localhost', //your Redis server address
  port: 6379, // default Redis port
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

export default redisClient;
