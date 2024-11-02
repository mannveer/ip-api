import Otp from '../models/otpModel.js';
import configs from '../config/index.js';
import { hashOtp } from '../utils/crypto.js';
import AppError from '../utils/errorHandler.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { constants } from '../utils/constant.js';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';

class OtpService {
  async generateOTP() {
    try {
      const otpNumber = Math.floor(Math.pow(10, configs.otp.OtpLength - 1) + Math.random() * 9 * Math.pow(10, configs.otp.OtpLength - 1)).toString();
      const otpHash = hashOtp(otpNumber);
      return { otpHash, otpNumber };
    } catch (error) {
      logger.error('Failed to generate OTP:', error);
      throw new AppError('OTP generation failed');
    }
  }

  async deleteExpiredOTPs() {
    try {
      await Otp.deleteMany({ createdAt: { $lt: new Date(Date.now() - configs.otp.OtpExpTime) } });
      logger.info('Expired OTPs deleted successfully');
    } catch (error) {
      logger.error('Failed to delete expired OTPs:', error);
      throw new AppError('Failed to delete expired OTPs');
    }
  }



  async compareOtp(inputOtp, storedOtp) {
    try {
      console.log('Validating OTP...');
      const hash = hashOtp(inputOtp);
      return hash === storedOtp;
    } catch (error) {
      console.error('Failed to validate OTP:', error);
      throw new AppError('OTP validation failed');
    }
  }

  isOTPExpired(createdAt) {
    try {
      const expirationTime = new Date(createdAt).getTime() + configs.otp.OtpExpTime;
      return Date.now() > expirationTime;
    } catch (error) {
      console.error('Failed to check OTP expiry:', error);
      throw new Error('OTP expiry check failed');
    }
  }


  async sendEmailWithRetry(emailService, otpNumber, retries = configs.email.emailMaxRetries) {
    let attempts = 0;

    while (attempts < retries) {
      try {
        await emailService.sendOTP({ otpNumber });
        logger.info('OTP email sent successfully');
        return;
      } catch (error) {
        attempts++;
        logger.error(`Attempt ${attempts}: Failed to send OTP email - ${error.message}`, error);

        const delay = configs.email.emailRetryDelay * Math.pow(2, attempts - 1);
        logger.warn(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    logger.error('All retry attempts exhausted. Failed to send OTP email.');
    throw new AppError('Failed to send OTP email after multiple attempts', 500);
  }



  sendEmailWithRetry1 = async (emailService, otpNumber, retries = configs.email.emailMaxRetries) => {
    try {
      await emailService.sendOTP({ otpNumber });
      logger.info('OTP email sent successfully.');
    } catch (error) {
      logger.error(`Error sending OTP email: ${error.message}`, error);

      if (retries > 0) {
        const attempt = configs.email.emailMaxRetries - retries + 1;
        logger.warn(`Retry ${attempt}: Retrying OTP email send...`);
        await new Promise(resolve => setTimeout(resolve, configs.email.emailRetryDelay));
        return this.sendEmailWithRetry1(emailService, otpNumber, retries - 1);
      } else {
        logger.error('Failed to send OTP email after multiple attempts.');

        if ([550, 551, 553].includes(error.responseCode)) {
          logger.error(`SMTP error ${error.responseCode}: Invalid email address.`);
          throw new AppError('Invalid email address. Please check the email and try again.', 400);
        } else {
          throw new AppError('Failed to send OTP email. Please try again later.', 500);
        }
      }
    }
  };


  compareTime(t1, t2) {
    return t1 >= t2
  }

  async generateOTPData(email, purpose) {
    const { otpHash, otpNumber } = await this.generateOTP();

    const otpDocument = await Otp.findOne({ email, purpose });
    logger.info(`OTP document for ${email} with purpose ${purpose}: ${otpDocument ? 'found' : 'not found'}`);

    if (otpDocument) {
      const currentTime = Date.now();
      const otpUpdatedTime = new Date(otpDocument.updatedAt).getTime();
      const timeDifference = currentTime - otpUpdatedTime;
      
      if (otpDocument.attempts.length >= configs.otp.OtpMaxAttempts) {
        if (timeDifference >= configs.otp.OtpAttemptLimitTime) {
          logger.info(`Resetting OTP attempts for ${email} due to time limit.`);
          otpDocument.attempts = [];
          otpDocument.otp = otpHash;
          otpDocument.isUsed = false;
          otpDocument.updatedAt = Date.now();
          await otpDocument.save();
          logger.info(`OTP attempts reset and new OTP saved for ${email}`);
        } else {
          logger.warn(`Maximum attempts reached for ${email}. Must wait 15 minutes.`);
          throw new AppError('Maximum attempts reached, try after 15 minutes', 400);
        }
      } else if (!otpDocument.isUsed && timeDifference < configs.otp.otpGenerateDelay) {
        logger.warn(`OTP exists for ${email} and was sent recently. Cannot resend yet.`);
        throw new AppError('OTP exists.', 409, { updatedAt: otpDocument.updatedAt });
      } else {
        logger.info(`Updating OTP for ${email}.`);
        otpDocument.isUsed = false;
        otpDocument.otp = otpHash;
        otpDocument.updatedAt = Date.now();
        await otpDocument.save();
        logger.info(`OTP updated successfully for ${email}`);
      }
    } else {
      await Otp.create({ otp: otpHash, email, purpose });
      logger.info(`New OTP created for ${email}`);
    }

    return otpNumber;
  }



  async validateOTPData(otp, email, purpose,name) {
    const otpDocument = await Otp.findOne({ email, purpose }).select('+otp');
    logger.info(`Starting OTP validation for ${email} with purpose ${purpose}.`);

    if (!otpDocument) {
      logger.warn(`No OTP found for ${email} with purpose ${purpose}.`);
      throw new AppError('OTP not found', 404);
    }

    if (otpDocument.isExpired()) {
      logger.warn(`OTP for ${email} has expired.`);
      otpDocument.attempts.push(Date.now());
      await otpDocument.save();
      throw new AppError('OTP expired', 400);
    }

    const prevUpdate = new Date(otpDocument.updatedAt).getTime();
    const prevAttempts = otpDocument.attempts;
    if (otpDocument.isUsed) {
      logger.warn(`OTP for ${email} has already been used.`);
      otpDocument.attempts.push(Date.now());
      await otpDocument.save();
      throw new AppError('OTP already used', 400);
    }
    const otpHash = hashOtp(otp);
    if (!otpDocument.compareOtp(otpHash)) {
      logger.warn(`Invalid OTP entered for ${email}.`);
      otpDocument.attempts.push(Date.now());
      await otpDocument.save();
      throw new AppError('Invalid OTP', 400);
    }
    else{
      otpDocument.isUsed = true;
      otpDocument.updatedAt = Date.now();
      otpDocument.attempts = [];
      await otpDocument.save();
    }

    logger.info(`OTP validation successful for ${email}.`);
    if (purpose !== constants.Purpose.na) {
      // let user = await User.findOneAndUpdate(
      //   { email },
      //   { $setOnInsert: {name:name, role: constants.role.user, createdAt: new Date(), updatedAt: new Date() } },
      //   { new: true, upsert: true }
      // );

      const user = await User.findOne({email});
      if(!user){
        try{
          user = await new User({
            name: name,
            email: email,
            role: constants.role.user,  
            purchases: [],  
            createdAt: new Date(), 
            updatedAt: new Date(), 
          }).save();
        }
        catch(err){
          logger.error(`Error creating new user for ${email}`, err);
          otpDocument.isUsed = false;
          otpDocument.updatedAt = prevUpdate;
          otpDocument.attempts = prevAttempts;
          await otpDocument.save();
          throw new AppError('Failed to create new user', 500);
        }
      }
      const accessToken = generateAccessToken(user);  
      // const refreshToken = generateRefreshToken(user);
      // res.cookie('refreshToken', refreshToken, {
      //   httpOnly: true,
      //   secure: true,
      //   sameSite: 'strict',
      //   maxAge: 7 * 24 * 60 * 60 * 1000
      // });

      user.accessToken = accessToken;
      user.updatedAt = new Date();
      await user.save();

      logger.info(`Access token generated and saved for ${email}.`);
      return { accessToken };
    }

    logger.info(`OTP validation completed successfully for ${email} without additional actions.`);
    return 'success';
  }


  async deleteOtp(email, purpose) {
    try {
      const result = await Otp.deleteOne({ email, purpose });
      if (result.deletedCount === 0) {
        throw new AppError('Failed to delete OTP', 404);
      }
      logger.info(`OTP deleted for email: ${email}, purpose: ${purpose}`);
    } catch (error) {
      logger.error(`Error deleting OTP for email: ${email}, purpose: ${purpose}`, error);
      throw new AppError('Failed to delete OTP', 500);
    }
  }


  async resendOTPData(email, purpose) {
    const { otpHash, otpNumber } = await this.generateOTP();

    const otpDocument = await Otp.findOne({ email, purpose });
    logger.info(`OTP document for ${email} with purpose ${purpose}: ${otpDocument ? 'found' : 'not found'}`);

    if (otpDocument) {
      const currentTime = Date.now();
      const otpUpdatedTime = new Date(otpDocument.updatedAt).getTime();
      const timeDifference = currentTime - otpUpdatedTime;
      
      if (otpDocument.attempts.length >= configs.otp.OtpMaxAttempts) {
        if (timeDifference >= configs.otp.OtpAttemptLimitTime) {
          logger.info(`Resetting OTP attempts for ${email} due to time limit.`);
          otpDocument.attempts = [];
          otpDocument.otp = otpHash;
          otpDocument.isUsed = false;
          otpDocument.updatedAt = Date.now();
          await otpDocument.save();
          logger.info(`OTP attempts reset and new OTP saved for ${email}`);
        } else {
          logger.warn(`Maximum attempts reached for ${email}. Must wait 15 minutes.`);
          throw new AppError('Maximum attempts reached, try after 15 minutes', 400);
        }
      } else if (!otpDocument.isUsed && timeDifference < configs.otp.otpResendTime) {
        logger.warn(`OTP exists for ${email} and was sent recently. Cannot resend yet.`);
        throw new AppError('OTP exists.', 409, { updatedAt: otpDocument.updatedAt });
      } else {
        logger.info(`Updating OTP for ${email}.`);
        otpDocument.isUsed = false;
        otpDocument.otp = otpHash;
        otpDocument.updatedAt = Date.now();
        await otpDocument.save();
        logger.info(`OTP updated successfully for ${email}`);
      }
    } else {
      await Otp.create({ otp: otpHash, email, purpose });
      logger.info(`New OTP created for ${email}`);
    }

    return otpNumber;
  }


}

export default new OtpService();
