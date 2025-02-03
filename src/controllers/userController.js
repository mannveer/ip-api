import { constants } from "../utils/constant.js";
import EmailService from "../services/email/emailService.js";
import userService from '../services/userService.js';
import { driveServiceInstance } from "../utils/gDrive.js";
import { getFileInfo, getFileInfo1 } from "../services/fileService.js";
import { isPaymentSuccess, isPaymentSuccess1 } from "../services/paymentService.js";

export const insertUser = async (req, res, next) => {
  try {
    const { email,name,purchase } = req.body;

    if(email !== req.user.email){
      return res.status(401).json({ status: 'error', message: 'User does not match' });
    }

    const alreadypaid = await isPaymentSuccess1(purchase.orderid,purchase.paymentid,email,purchase.fileid,req.user);
    if(alreadypaid) res.status(409).json({ status: 'error', message: 'payment id error' });

    const { user,token } = await userService.inserData({ email,name,purchase });
    
    const fileinfo = await getFileInfo1(purchase.fileid);
    await driveServiceInstance.shareFile(fileinfo.googleDrive.fileId,email);
    const emailService = new EmailService(user, `${constants.emailVerificationUrl}`);
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
    const { email,name,fileid } = req.query;

    const {user,filePurchase} = await userService.getDetails({ email,fileid });
    if (!filePurchase) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    res.status(200).json({ status: 'success', data: filePurchase });

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
    const { email,fileid } = req.body;
    if(!email || !fileid){
      return res.status(400).json({ status: 'error', message: 'Email and FileId is required' });
    }

    const user = await userService.getDetailsByEmail(email);

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const filedetails = user.purchases.find(element => {
      return element.purchase.fileid === fileid && element.purchase.status === 'success';      
    });

    if (!filedetails) {
      return res.status(404).json({ status: 'error', message: 'User do not have access to the specified file.' });
    }

    const fileinfo = await getFileInfo1(fileid);
    console.log(fileinfo)
    await driveServiceInstance.shareFile(fileinfo.googleDrive.fileId,email);

    const emailService = new EmailService(user, `${constants.emailVerificationUrl}`);
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

