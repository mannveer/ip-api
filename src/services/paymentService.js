import User from "../models/userModel.js";
import Razorpay from 'razorpay';
import crypto from 'crypto';
import AppError from '../utils/errorHandler.js';
import configs from '../config/index.js'
import logger from '../utils/logger.js';

const razorpay = new Razorpay({
  key_id: configs.razorpay.key_id,
  key_secret: configs.razorpay.key_secret,
});


export const isPaymentSuccessDb = async (email,pid,fileid) => {
  if(!email || !pid || !fileid){
    throw new AppError('Payment Id, email Id and FileId is required',500);
  }
  try{
    const user = await User.findOne({email});
    if(!user){
      throw new AppError('User not found',404);
    }
    const filedetails = user.purchases.find(purchase => purchase.orderid === oid && purchase.paymentid === pid && purchase.status === 'success' && purchase.fileid === fileid);
    if(!filedetails){
      return false;
    }
    return true;
  }
  catch(err){
    return false;
  }
}

export const isPaymentSuccess = async (pid, email, fileid) => {
  try {
    logger.info('Inside isPaymentSuccess and Fetching payment');

    if(!email || !pid || !fileid){
      throw new AppError('Payment ID and email is required',500);
    }

    const payment = await razorpay.payments.fetch(pid);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }
    if (payment.email !== email) {
      throw new AppError('Email and Payment ID do not match', 400);
    }
    if (payment.status !== 'captured') {
      throw new AppError('Payment not captured or invalid', 400);
    }

    const alreadyProcessed = await isPaymentSuccessDb(email, payment.order_id, fileid, pid);
    return alreadyProcessed;

  } catch (error) {
    logger.error('Error fetching payment:', error);
    throw new AppError("Error fetching payment", 500)
  }
}

export const isPaymentSuccess1 = async (oid, pid, email, fileid, reqUser) => {
  try {
    logger.info('Inside isPaymentSuccess and Fetching payment');

    if(!email || !pid || !fileid){
      throw new AppError('Payment ID and email is required',500);
    }

    const payment = await razorpay.payments.fetch(pid);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }
    if (payment.email !== email) {
      throw new AppError('Email and Payment ID do not match', 400);
    }
    if (payment.status !== 'captured') {
      throw new AppError('Payment not captured or invalid', 400);
    }
    const a = reqUser.purchases.find(purchase => purchase.orderid === oid && purchase.paymentid === pid && purchase.status === 'success' && purchase.fileid === fileid);
    return reqUser.purchases.find(purchase => purchase.orderid === oid && purchase.paymentid === pid && purchase.status === 'success' && purchase.fileid === fileid);


  } catch (error) {
    logger.error('Error fetching payment:', error);
    throw new AppError("Error fetching payment", 500)
  }
}

export const isValidPaymentId = async (pid) => {
  try {
    if (!pid) {
      throw new AppError('Payment ID is required',500);
    }
    const payment = await razorpay.payments.fetch(pid);

    if (payment && payment.status === 'captured') {
      return { isValid: true, message: 'Payment is valid', data: payment  };
    } else {
      return { isValid: false, message: 'Payment not captured or invalid', data:payment };
    }
  } catch (error) {
    return { isValid: false, data:error , message: `Error validating payment ID: ${error.message}` };
  }
};


