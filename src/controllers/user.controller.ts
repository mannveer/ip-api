import { Request, Response, NextFunction } from 'express';
import { constants } from "../utils/constant";
import emailqueueService from '../services/email/emailqueue.service';
import UserService from '../services/user.service';
import { driveServiceInstance } from "../utils/gDrive";
import FileService from "../services/file.service";
import PaymentService from "../services/payment.service";

class UserController {
  /**
   * Insert user and process payment
   */
  async insertUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { purchase, name } = req.body;
      const email = req.user.email;

      const { payment, alreadyProcessed } = await PaymentService.isPaymentSuccess(
        purchase.orderid, purchase.paymentid, email, purchase.fileid, req.user
      );
      
      if (alreadyProcessed) {
        res.status(409).json({ status: 'error', message: 'payment id error' });
        return;
      }

      await PaymentService.insertPayment(req.user._id, payment);
      
      const fileinfo = await FileService.getFileInfo(purchase.fileid);
      await driveServiceInstance.shareFile(fileinfo.googleDrive.fileId, email);
      
      // Queue welcome email instead of sending directly
      emailqueueService.add('welcome', {
        user: req.user,
        url: constants.emailVerificationUrl
      });
      
      res.status(201).json({ status: 'success' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user details by file ID
   */
  async getUserDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileid } = req.query;

      if (!fileid) {
        res.status(400).json({ status: 'error', message: 'FileId is required' });
        return;
      }

      const filePurchase = await PaymentService.fetchPaymentByUserAndFile(req.user._id, fileid as string);

      if (!filePurchase || filePurchase.length === 0) {
        res.status(404).json({ status: 'error', message: 'User not found' });
        return;
      }
      
      res.status(200).json({ status: 'success', data: filePurchase[0] });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Email file to user
   */
  async emailFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileid } = req.body;
      const email = req.user.email;
      
      if (!fileid) {
        res.status(400).json({ status: 'error', message: 'FileId is required' });
        return;
      }

      const filedetails = await PaymentService.fetchPaymentByUserAndFile(req.user._id, fileid);
      
      if (!filedetails || filedetails.length === 0) {
        res.status(404).json({ 
          status: 'error', 
          message: 'User does not have access to the specified file.' 
        });
        return;
      }

      const fileinfo = await FileService.getFileInfo(fileid);
      await driveServiceInstance.shareFile(fileinfo.googleDrive.fileId, email);

      // Queue welcome email instead of sending directly
      emailqueueService.add('welcome', {
        user: req.user,
        url: constants.emailVerificationUrl
      });
      
      res.status(201).json({ status: 'success', message: 'Email sent successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send contact email
   */
  async sendContactEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, name, message } = req.body;

      if (!email || !name || !message) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Email, message and Name are required' 
        });
        return;
      }

      // Queue contact thank you email
      emailqueueService.add('contactThanks', {
        user: { email },
        url: constants.emailVerificationUrl
      });
      
      await UserService.saveContactUser({ email, name, message });
      res.status(201).json({ status: 'success', message: 'Email sent successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
