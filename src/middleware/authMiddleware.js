import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import AppError from '../utils/errorHandler.js';
import { promisify } from 'util';
import configs from '../config/index.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Authentication failed: No token provided.', 401));
    }

    const decoded = await promisify(jwt.verify)(token, configs.jwt.jwtSecret);
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next(new AppError('Authentication failed: User no longer exists.', 401));
    }

    // if(currentUser.email !== req.email){
    //   return next(new AppError('Authentication failed: User does not match.', 401));
    // }

    req.user = currentUser;
    next();
  } catch (error) {
    let message = 'Authentication failed. Please log in again.';
    if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token. Please log in again.';
    } else if (error.name === 'TokenExpiredError') {
      message = 'Token has expired. Please log in again.';
    }
    next(new AppError(message, 401));
  }
};
