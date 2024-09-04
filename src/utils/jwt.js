import jwt from 'jsonwebtoken';
import { jwtSecret, jwtExpiresIn } from '../config/config.js';


const generateAccessToken = (user) => {
  console.log('jwtSecret', jwtExpiresIn);
  return jwt.sign({ id: user._id, email: user.email }, jwtSecret, { expiresIn: jwtExpiresIn });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

export { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
