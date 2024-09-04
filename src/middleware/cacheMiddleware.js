import redisClient from '../config/cache.js';

export const cache = (req, res, next) => {
  const key = req.originalUrl || req.url;

  if (!redisClient.connected) {
    console.error('Redis client is not connected');
    return next();
  }

  redisClient.get(key, (err, data) => {
    if (err) {
      console.error('Redis get error:', err);
      return next();
    }

    if (data != null) {
      res.send(JSON.parse(data));
    } else {
      res.sendResponse = res.send;
      res.send = (body) => {
        redisClient.setex(key, 3600, JSON.stringify(body), (err) => {
          if (err) {
            console.error('Redis setex error:', err);
          }
        });
        res.sendResponse(body);
      };
      next();
    }
  });
};