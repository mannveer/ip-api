import Otp from '../models/otpModel.js';
import { OtpExpTime, OtpLength } from '../config/config.js';
import { hashOtp } from '../utils/crypto.js';

class OtpService {
  async generateOTP() {
    try {
      console.log('Generating OTP...');
      const otpNumber = Math.floor(Math.pow(10, OtpLength - 1) + Math.random() * 9 * Math.pow(10, OtpLength - 1)).toString();
      const otpHash = hashOtp(otpNumber);
      return { otpHash, otpNumber };
    } catch (error) {
      console.error('Failed to generate OTP:', error);
      throw new Error('OTP generation failed');
    }
  }

  async deleteExpiredOTPs() {
    try {
      await Otp.deleteMany({ createdAt: { $lt: new Date(Date.now() - OtpExpTime) } });
      console.log('Expired OTPs deleted successfully');
    } catch (error) {
      console.error('Failed to delete expired OTPs:', error);
      throw new Error('Failed to delete expired OTPs');
    }
  }

  async compareOtp(inputOtp, storedOtp) {
    try {
      console.log('Validating OTP...');
      const hash = hashOtp(inputOtp);
      return hash === storedOtp;
    } catch (error) {
      console.error('Failed to validate OTP:', error);
      throw new Error('OTP validation failed');
    }
  }

  isOTPExpired(createdAt) {
    try {
      const expirationTime = new Date(createdAt).getTime() + OtpExpTime;
      return Date.now() > expirationTime;
    } catch (error) {
      console.error('Failed to check OTP expiry:', error);
      throw new Error('OTP expiry check failed');
    }
  }
}

export default new OtpService();
