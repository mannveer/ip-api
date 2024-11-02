import jwt from 'jsonwebtoken';
import configs from '../config/index.js';


const generateAccessToken = (user) => {
  console.log('jwtSecret', configs.jwt.jwtExpiresIn);
  return jwt.sign({ id: user._id, email: user.email }, configs.jwt.jwtSecret, { expiresIn: jwtExpiresIn });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, configs.jwt.jwtRefreshSecret, { expiresIn: '7d' });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, configs.jwt.jwtSecret);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, configs.jwt.jwtRefreshSecret);
};

export { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
