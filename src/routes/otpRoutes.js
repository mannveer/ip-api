import express from 'express';
import { generateOtp, resendOtp, validateOtp, validationMiddleware } from '../controllers/otpController.js';

const router = express.Router();

router.post('/generate',validationMiddleware, generateOtp);
router.post('/validate',validationMiddleware, validateOtp);
router.post('/resend',validationMiddleware, resendOtp);

export default router;
