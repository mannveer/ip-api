import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import AppError from '../utils/errorHandler.js';
import { promisify } from 'util';
import { jwtSecret, jwtExpiresIn } from '../config/config.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  const decoded = await promisify(jwt.verify)(token, jwtSecret);

  // const decoded = await promisify(verifyAccessToken)(token);


  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  req.user = currentUser;
  next();
};

