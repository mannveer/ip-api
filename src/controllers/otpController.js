import otpService from '../services/otpService.js';
import EmailService from '../services/email/emailService.js';
import Otp from '../models/otpModel.js';
import ErrorHandler from '../utils/errorHandler.js';

const MAX_RETRIES = 3; // Maximum number of retries
const RETRY_DELAY = 2000; // Delay between retries in milliseconds

const sendEmailWithRetry = async (emailService, otpNumber, retries = MAX_RETRIES) => {
  try {
    await emailService.sendOTP({ otpNumber });
    console.log('OTP email sent');
  } catch (error) {
    if (retries > 0) {
      console.error(`Retry ${MAX_RETRIES - retries + 1}: Error sending OTP email:`, error);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return sendEmailWithRetry(emailService, otpNumber, retries - 1);
    } else {
      console.error('Failed to send OTP email after multiple attempts:', error);
      throw new ErrorHandler('Failed to send OTP email. Please try again later.', 500);
    }
  }
};

export const generateOtp = async (req, res, next) => {
  try {
    if (!req.body.email || !req.body.purpose) {
      return res.status(400).json({ message: 'Email and purpose is required' });
    }

    const { otpHash, otpNumber } = await otpService.generateOTP();

    const otpDocument = await Otp.findOne({ email: req.body.email,purpose:req.body.purpose });
    if (otpDocument) {
      if (otpDocument.isUsed) {
        otpDocument.isUsed = false;
        otpDocument.otp = otpHash;
        otpDocument.updatedAt = Date.now();
        await otpDocument.save();
      } else {
        if (!otpDocument.isExpired()) {
          return res.status(409).json({ message: 'OTP exists.', updatedAt: otpDocument.updatedAt });
        } else {
          otpDocument.otp = otpHash;
          otpDocument.updatedAt = Date.now();
          await otpDocument.save();
        }
      }
    } else {
      const otp = new Otp({ otp: otpHash, email: req.body.email,purpose:req.body.purpose });
      await otp.save();
    }

    const emailService = new EmailService({ email: req.body.email }, '');

    try {
      await sendEmailWithRetry(emailService, otpNumber);
    } catch (error) {
      await Otp.deleteOne({ email : req.body.email});
      return res.status(500).json({
        message: 'Failed to send OTP email. Please try again later.',
      });
    }

    res.status(201).json({ otp: otpNumber });
  } catch (error) {
    next(error);
  }
};

export const validateOtp = async (req, res, next) => {
  try {
    const { otp,email,purpose } = req.body;

    if (!otp || !email || !purpose) {
      return res.status(400).json({ message: 'Email, OTP and purpose are required' });
    }

    // const storedOtp = await Otp.findOne({email,otp}).sort({ createdAt: -1 });
    const storedOtp = await Otp.findOne({email,purpose}).select('+otp');

    if (!storedOtp) {
      return res.status(404).json({ message: 'OTP not found' });
    }
    if(storedOtp.isUsed){
      return res.status(400).json({ message: 'OTP already used' });
    }
    const isMatch = await otpService.compareOtp(otp, storedOtp.otp);
    if (!isMatch || storedOtp.isExpired()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    storedOtp.isUsed = true;
    await storedOtp.save();
    
    res.status(200).json({ message: 'OTP validated successfully' });
  } catch (error) {
    next(error);
  }
};
