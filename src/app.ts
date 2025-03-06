import express from 'express';
import { Request, Response } from 'express';
import bodyParser from 'body-parser';
import corsConfig from './middleware/corsConfig';
import { handleError } from './middleware/errorHandler';
import { trackHttpRequests, exposeMetrics } from './metrics/metrics';
import { apiRateLimiter } from './middleware/rateLimiter';
import fileRouter from './routes/file.route';
import paymentRouter from './routes/payment.route';
import otpRouter from './routes/otp.route';
import userRouter from './routes/user.route';
import configs from './config/index';
import projectRoutes from './routes/project.route';

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
app.use('/api/v1/projects', projectRoutes);


app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.sendStatus(200);
});

app.use(handleError);

app.get('/', (req:Request, res:Response) => res.json({ message: `Welcome to ${configs.appName}!` }));

export default app;
