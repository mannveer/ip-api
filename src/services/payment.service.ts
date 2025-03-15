import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import configs from '../config/index';
import Razorpay from 'razorpay';
import User from '../models/user.model';
import Purchase from '../models/payment.model';
import { Document } from 'mongoose';

interface PaymentResponse {
  isValid?: boolean;
  message: string;
  data?: any;
  payment?: any;
  alreadyProcessed?: boolean;
}

const razorpayClient = new Razorpay({
  key_id: configs.razorpay.key_id ?? '',
  key_secret: configs.razorpay.key_secret ?? '',
});

class PaymentService {

  async verifyPayment(pid: string, email: string, fileid: string, reqUser: any): Promise<PaymentResponse> {
    try {
      logger.info('Verifying payment with Razorpay');

      if (!email || !pid || !fileid) {
        throw new AppError('Payment ID, email and file ID are required', 500);
      }

      const payment = await razorpayClient.payments.fetch(pid);
      
      if (!payment) {
        throw new AppError('Payment not found', 404);
      }
      
      if (payment.email !== email || payment.notes.email !== email) {
        throw new AppError('Email and Payment ID do not match', 400);
      }

      if (payment.notes.fileId !== fileid) {
        throw new AppError('File ID does not match', 400);
      }

      if (payment.status !== 'captured') {
        throw new AppError('Payment not captured or invalid', 400);
      }

      const purchases = await this.fetchPaymentsByFileId(reqUser._id, fileid);
      
      return {
        payment,
        alreadyProcessed: purchases.length > 0,
        message: 'Payment verification completed'
      };
    } catch (error:any) {
      logger.error('Error verifying payment:', error);
      throw new AppError(error.message || "Error verifying payment", error.statusCode || 500);
    }
  }

  async validatePaymentId(pid: string): Promise<PaymentResponse> {
    try {
      if (!pid) {
        throw new AppError('Payment ID is required', 500);
      }
      
      const payment = await razorpayClient.payments.fetch(pid);

      if (payment && payment.status === 'captured') {
        return { 
          isValid: true, 
          message: 'Payment is valid', 
          data: payment 
        };
      } else {
        return { 
          isValid: false, 
          message: 'Payment not captured or invalid', 
          data: payment 
        };
      }
    } catch (error:any) {
      logger.error('Error validating payment ID:', error);
      return { 
        isValid: false, 
        data: error, 
        message: `Error validating payment ID: ${error.message}` 
      };
    }
  }

  async fetchAllPayments(userId: string): Promise<Array<any>> {
    try {
      if (!userId) {
        throw new AppError('User ID is required', 400);
      }

      const purchases = await Purchase.find({ user_id: userId })
        .select('-__v')
        .lean();

      return purchases || [];
    } catch (err) {
      logger.error(`Error fetching purchases for user ${userId}:`, err);
      return [];
    }
  }

  async fetchPaymentsByFileId(userId: string, fileId: string): Promise<Array<any>> {
    try {
      if (!userId || !fileId) {
        throw new AppError('User ID and File ID are required', 400);
      }

      const purchases = await Purchase.find({ 
        user_id: userId, 
        'notes.fileId': fileId 
      })
        .select('-__v')
        .lean();

      return purchases || [];
    } catch (err) {
      logger.error(`Error fetching purchases for user ${userId} and file ${fileId}:`, err);
      return [];
    }
  }

  async createPayment(userId: string, paymentData: any): Promise<Document | null> {
    try {
      if (!userId || !paymentData) {
        throw new AppError('User ID and payment data are required', 400);
      }

      const purchase = new Purchase({
        user_id: userId,
        ...paymentData
      });

      await purchase.save();
      return purchase;
    } catch (err) {
      logger.error(`Error creating purchase for user ${userId}:`, err);
      return null;
    }
  }
}

export default new PaymentService();
