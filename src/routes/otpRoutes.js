import express from 'express';
import { generateOtp, validateOtp } from '../controllers/otpController.js';

const router = express.Router();

router.post('/generate', generateOtp);
router.post('/validate', validateOtp);

export default router;
