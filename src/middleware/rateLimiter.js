import rateLimit from 'express-rate-limit';
import { constants } from '../utils/constant.js';

export const apiRateLimiter = rateLimit({
    windowMs: constants.fifteenMins, // 15 minutes
    max: 100,
    message: constants.apiRateLimitMessage,
    headers: true,
});

export const authRateLimiter = rateLimit({
    windowMs: constants.fifteenMins, // 15 minutes
    max: 10,
    message: constants.authRateLimitMessage,
    headers: true,
});
