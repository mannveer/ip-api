import { constants } from "../utils/constant.js";
import EmailService from "../services/email/emailService.js";
import userService from '../services/userService.js';
import { driveServiceInstance } from "../utils/gDrive.js";
import { getFileInfo1 } from "../services/fileService.js";
import { fetchPaymentDB1, insertPaymentDB, isPaymentSuccess1 } from "../services/paymentService.js";

export const insertUser = async (req, res, next) => {
  try {
    const { purchase, name } = req.body;
    const email = req.user.email;

    const {payment, alreadyProcessed} = await isPaymentSuccess1(purchase.orderid,purchase.paymentid,email,purchase.fileid,req.user);
    if(alreadyProcessed) {
      return res.status(409).json({ status: 'error', message: 'payment id error' });
    }

    

    // const { user,token } = await userService.inserData({ email,name,purchase });
    await insertPaymentDB(req.user._id,payment);
    
    const fileinfo = await getFileInfo1(purchase.fileid);
    await driveServiceInstance.shareFile(fileinfo.googleDrive.fileId,email);
    const emailService = new EmailService(req.user, `${constants.emailVerificationUrl}`);
    emailService.sendWelcome()
      .then(() => {
        console.log('Welcome email sent');
        res.status(201).json({ status: 'success' });
      })
      .catch(error => {
        console.error('Error sending welcome email:', error)
        res.status(500).json({ status: 'error', message: 'Error sending welcome email' });
      });
      
  } catch (error) {
    next(error);
  }
};

export const getUserDetails = async (req, res, next) => {
  try {
    const { fileid } = req.query;

    if (!fileid) {
      return res.status(400).json({ status: 'error', message: 'FileId is required' });
    }

    const filePurchase = await fetchPaymentDB1(req.user._id, fileid);


    if (!filePurchase || filePurchase.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    res.status(200).json({ status: 'success', data: filePurchase[0] });

    // const emailService = new EmailService(user, `${constants.emailVerificationUrl}`);
    // emailService.sendWelcome()
    // .then(() => {
    //   console.log('Welcome email sent');
    //   res.status(201).json({ status: 'success', data: { user } });
    // })
    // .catch(error => {
    //   console.error('Error sending welcome email:', error);
    //   res.status(500).json({ status: 'error', message: 'Error sending welcome email' });
    // });

  } catch (error) {
    next(error);
  }
};

export const emailFile = async (req, res, next) => {
  try {
    const { fileid } = req.body;
    const email = req.user.email;
    if(!fileid){
      return res.status(400).json({ status: 'error', message: 'FileId is required' });
    }

    const filedetails = await fetchPaymentDB1(req.user._id, fileid);
    
    if (!filedetails || filedetails.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User do not have access to the specified file.' });
    }

    const fileinfo = await getFileInfo1(fileid);
    console.log(fileinfo)
    await driveServiceInstance.shareFile(fileinfo.googleDrive.fileId,email);

    const emailService = new EmailService(req.user, `${constants.emailVerificationUrl}`);
    emailService.sendWelcome()
      .then(() => {
        console.log('Welcome email sent')
        res.status(201).json({ status: 'success', message: 'Email sent successfully' });
      })
      .catch(error => {
        console.error('Error sending welcome email:', error)
        res.status(500).json({ status: 'error', message: 'Error sending welcome email' });
      });
      
  } catch (error) {
    next(error);
  }
}

export const sendContactEmail = async (req,res,next) =>{
  const { email,name,message } = req.body;
  // const email = req.user.email;
  // const name = req.user.name;

  if (!email || !name || !message) {
    return res.status(400).json({ status: 'error', message: 'Email, message and Name is required' });
  }

  
  const emailService = new EmailService({email}, `${constants.emailVerificationUrl}`);
  emailService.sendContactThanks()
    .then(async () => {
      console.log('Thanks email sent')
      await userService.saveContactUser({email,name,message});
      res.status(201).json({ status: 'success', message: 'Email sent successfully' });
    })
    .catch(error => {
      console.error('Error sending welcome email:', error)
      res.status(500).json({ status: 'error', message: 'Error sending welcome email' });
    });
}

