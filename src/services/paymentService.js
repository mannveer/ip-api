import User from "../models/userModel.js";
import Razorpay from 'razorpay';
import AppError from '../utils/errorHandler.js';
import configs from '../config/index.js'
import logger from '../utils/logger.js';
import Purchase from "../models/paymentModel.js";

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
    if (payment.email !== email || payment.notes.email !== email) {
      throw new AppError('Email and Payment ID do not match', 400);
    }

    if(payment.notes.fileId !== fileid){
      throw new AppError('File ID does not match',400);
    }

    if (payment.status !== 'captured') {
      throw new AppError('Payment not captured or invalid', 400);
    }

    const purchases = await fetchPaymentDB1(reqUser._id, fileid);
    
    if(!purchases || purchases.length === 0){
      return {payment, alreadyProcessed: false};
    }
    return {payment, alreadyProcessed: true};

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


export const fetchPaymentDB = async (user_id) => {
  try {
    if (!user_id) {
      throw new Error('User ID is required');
    }

    const purchases = await Purchase.find({ user_id })
      .select('-__v') // Exclude unnecessary fields
      .lean();

    if (!purchases || purchases.length === 0) {
      return [];
    }

    return purchases;
  } catch (err) {
    logger.error(`Error fetching purchases for user ${user_id}:`, err);
    return [];
  }
};

export const fetchPaymentDB1 = async (user_id, fileid) => {
  try {
    if (!user_id || !fileid) {
      throw new Error('User ID and File ID are required');
    }

    const purchases = await Purchase.find({ user_id, 'notes.fileId': fileid })
      .select('-__v')
      .lean();

    return purchases;
  } catch (err) {
    logger.error(`Error fetching purchases for user ${user_id} and file ${fileid}:`, err);
    return [];
  }
};

export const insertPaymentDB = async (userid,paymentData) => {
  try {
    if (!userid || !paymentData) {
      throw new Error('User ID and payment data are required');
    }

    const purchase = new Purchase({
      user_id: userid,
      ...paymentData
    });

    await purchase.save();
    return purchase;
  } catch (err) {
    logger.error(`Error inserting purchase for user ${userid}:`, err);
    return null;
  }
}

  