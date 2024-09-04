import otpService from '../services/otpService.js';
import EmailService from '../services/email/emailService.js';
import Otp from '../models/otpModel.js';
import ErrorHandler from '../utils/errorHandler.js';
import {generateAccessToken,generateRefreshToken} from '../utils/jwt.js';
import User from '../models/userModel.js'
import { constants } from '../utils/constant.js';
import { name } from 'ejs';
import{MAX_RETRIES_EMAIL,EMAIL_RETRY_DELAY} from '../config/config.js';

const sendEmailWithRetry = async (emailService, otpNumber, retries = MAX_RETRIES_EMAIL) => {
  try {
    await emailService.sendOTP({ otpNumber });
    console.log('OTP email sent');
  } catch (error) {
    if (retries > 0) {
      console.error(`Retry ${MAX_RETRIES_EMAIL - retries + 1}: Error sending OTP email:`, error);
      await new Promise(resolve => setTimeout(resolve, EMAIL_RETRY_DELAY));
      return sendEmailWithRetry(emailService, otpNumber, retries - 1);
    } else {
      console.error('Failed to send OTP email after multiple attempts:', error);

      // Check for specific SMTP errors like invalid email or domain
      if (error.responseCode === 550 || error.responseCode === 551 || error.responseCode === 553) {
        throw new ErrorHandler('Invalid email address. Please check the email and try again.', 400);
      } else {
        throw new ErrorHandler('Failed to send OTP email. Please try again later.', 500);
      }
    }
  }
};

export const generateOtp = async (req, res, next) => {
  try {
    if (!req.body.email || !req.body.purpose) {
      return res.status(400).json({ message: 'Email and purpose are required' });
    }

    const { otpHash, otpNumber } = await otpService.generateOTP();

    const otpDocument = await Otp.findOne({ email: req.body.email, purpose: req.body.purpose });
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
      const otp = new Otp({ otp: otpHash, email: req.body.email, purpose: req.body.purpose });
      await otp.save();
    }

    const emailService = new EmailService({ email: req.body.email }, '');

    try {
      await sendEmailWithRetry(emailService, otpNumber);
      res.status(201).json({ otp: otpNumber });
    } catch (error) {
      await Otp.deleteOne({ email: req.body.email });
      return res.status(error.statusCode || 500).json({
        message: error.message || 'Failed to send OTP email. Please try again later.',
      });
    }

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
    const userOtp = await storedOtp.save();

    if(purpose !== constants.Purpose.na){
      let userFile = await User.findOne({email});
      // const result = await User.updateOne(query, { $set: updateData }, { upsert: true });
      if(!userFile){
        userFile = await new User({
          name: name,
          email: email,
          role: constants.role.user,  
          purchases: [],  
          createdAt: new Date(), 
          updatedAt: new Date(), 
        }).save();
      }
      const accessToken = generateAccessToken(userFile);
      userFile.accessToken = accessToken;
      await userFile.save();
      return res.status(200).json({ message: 'OTP validated successfully', accessToken });
    }

  //   const refreshToken = generateRefreshToken(payload);

  //   res.cookie('refreshToken', refreshToken, {
  //     httpOnly: true,
  //     secure: true,
  //     sameSite: 'strict',
  //     maxAge: 7 * 24 * 60 * 60 * 1000
  // });

    res.status(200).json({ message: 'OTP validated successfully' });
  } catch (error) {
    next(error);
  }
};


