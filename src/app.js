import express from 'express';
import bodyParser from 'body-parser';
import corsConfig from './middleware/corsConfig.js';
import { handleError } from './middleware/errorHandler.js';
import { trackHttpRequests, exposeMetrics } from './metrics/metrics.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import fileRouter from './routes/fileRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import otpRouter from './routes/otpRoutes.js';
import userRouter from './routes/userRoutes.js';
import configs from './config/index.js';

const app = express();

app.use(corsConfig);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(trackHttpRequests);

if (configs.metrics.enabled) {
    app.get('/metrics', exposeMetrics);
}

app.use('/api/v1', apiRateLimiter);

app.use('/api/v1/file', fileRouter);
app.use('/api/v1/payment', paymentRouter);
app.use('/api/v1/otp', otpRouter);
app.use('/api/v1/user', userRouter);

app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.sendStatus(200);
});

app.use(handleError);

app.get('/', (req, res) => res.json({ message: `Welcome to ${configs.appName}!` }));

export default app;
