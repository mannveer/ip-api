import otpService from '../services/otpService.js';
import EmailService from '../services/email/emailService.js';
import { constants } from '../utils/constant.js';
import logger from '../utils/logger.js'; // Adjust the import path as necessary

export const validationMiddleware = (req, res, next) => {
  const { email, purpose } = req.body;
  if (!email || !purpose) {
    return res.status(400).json({ message: 'Email and purpose are required' });
  }
  next();
};


export const generateOtp = async (req, res, next) => {
  const { email, purpose } = req.body;

  try {
    const otpNumber = await otpService.generateOTPData(email, purpose);
    const emailService = new EmailService({ email }, '');

    try {
      await otpService.sendEmailWithRetry(emailService, otpNumber);
      res.status(201).json({ message: 'OTP sent successfully.' });
    } catch (emailError) {
      await otpService.deleteOtp(email, purpose);
      logger.error(`Failed to send OTP email for ${email}:`, emailError);
      res.status(500).json({
        message: 'Failed to send OTP email. Please try again later.',
      });
    }
  } catch (error) {
    logger.error(`Error generating OTP for ${email}:`, error);
    next(error);
  }
};


export const validateOtp = async (req, res, next) => {
  const { otp, email, purpose,name } = req.body;

  if (!otp) {
    return res.status(400).json({ message: 'OTP is required' });
  }

  try {
    const result = await otpService.validateOTPData(otp, email, purpose,name);

    if (result !== constants.success) {
  //   const refreshToken = generateRefreshToken(payload);
  //   res.cookie('refreshToken', refreshToken, {
  //     httpOnly: true,
  //     secure: true,
  //     sameSite: 'strict',
  //     maxAge: 7 * 24 * 60 * 60 * 1000
  //    });
      return res.status(200).json({ message: 'OTP validated successfully', accessToken: result.accessToken });
    }

    res.status(200).json({ message: 'OTP validated successfully' });
  } catch (error) {
    logger.error(`Error validating OTP for ${email}:`, error);
    next(error);
  }
};


export const resendOtp = async (req, res, next) => {
  const { email, purpose } = req.body;

  try {
    const otpNumber = await otpService.resendOTPData(email, purpose);
    const emailService = new EmailService({ email }, '');

    try {
      await otpService.sendEmailWithRetry(emailService, otpNumber);
      res.status(201).json({ message: 'OTP resent successfully.' });
    } catch (emailError) {
      await otpService.deleteOtp(email, purpose);
      logger.error(`Failed to resend OTP email for ${email}:`, emailError);
      res.status(500).json({
        message: 'Failed to resend OTP email. Please try again later.',
      });
    }
  } catch (error) {
    logger.error(`Error resending OTP for ${email}:`, error);
    next(error);
  }
};