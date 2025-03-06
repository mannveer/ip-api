import crypto from 'crypto';
import bcrypt from 'bcrypt';

export const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

export const hashPassword = (password, saltRounds) => {
    return bcrypt.hash(password, saltRounds);
  };
  

