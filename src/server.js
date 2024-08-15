import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { handleError } from './middleware/errorHandler.js';
import { configs } from './config/config.js';
import fileRouter from './routes/fileRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import otpRouter from './routes/otpRoutes.js';
import userRouter from './routes/userRoutes.js';
import { db } from '../db.js';

const app = express();
app.use(cors());
app.use(handleError);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));


app.use('/api/v1/file', fileRouter);
app.use('/api/v1/payment', paymentRouter);
app.use('/api/v1/otp', otpRouter);
app.use('/api/v1/user', userRouter);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to desigs Store' });
})

app.listen(configs.port, (err) => {
    if (err) {
        console.error('Error starting the server');
        process.exit(1);
    }
    console.log(`Server is running on port ${configs.port}`);
});
