import { constants } from "../utils/constant.js";
import EmailService from "../services/email/emailService.js";
import userService from '../services/userService.js';
import otpService from "../services/otpService.js";
import Otp from '../models/otpModel.js';
import Contact from "../models/contactModel.js";

export const insertUser = async (req, res, next) => {
  try {
    const { email,name,otp,purpose,purchase } = req.body;

    if(!email || !name || !otp || !purpose){
      return res.status(400).json({ status: 'error', message: 'Email, Name and OTP is required' });
    }

    const storedOtp = await Otp.findOne({email,purpose:purpose}).select('+otp');

    if (!storedOtp) {
      return res.status(404).json({ message: 'OTP not found' });
    }
    if(!storedOtp.isUsed){
      return res.status(400).json({ message: 'OTP not verified' });
    }
    
    const isMatch = await otpService.compareOtp(otp, storedOtp.otp);
    if (!isMatch || storedOtp.isExpired()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const { user,token } = await userService.inserData({ email,name,purchase });

    const emailService = new EmailService(user, `${constants.emailVerificationUrl}`);
    emailService.sendWelcome()
      .then(() => {
        console.log('Welcome email sent');
        res.status(201).json({ status: 'success', token, data: { user } });
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
    const { email,name,otp,purpose } = req.query;
    console.log('req.params',req.query);

    if (!email || !name || !otp || !purpose) {
      return res.status(400).json({ status: 'error', message: 'Email, OTP, Purpose and Name is required' });
    }

    const storedOtp = await Otp.findOne({email,purpose}).select('+otp');

    if (!storedOtp) {
      return res.status(404).json({ message: 'OTP not found' });
    }
    if(!storedOtp.isUsed){
      return res.status(400).json({ message: 'OTP not verified' });
    }

    const isMatch = await otpService.compareOtp(otp, storedOtp.otp);
    if (!isMatch || storedOtp.isExpired()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await userService.getDetails({ email,name });
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    res.status(200).json({ status: 'success', data: { user } });

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
    const { userid,fileid } = req.body;
    if(!userid){
      return res.status(400).json({ status: 'error', message: 'User Id is required' });
    }

    const user = await userService.getDetailsById(userid);

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const filedetails = user.purchases.find(element => {
      return element.fileid === fileid;      
    });

    if (!filedetails) {
      return res.status(404).json({ status: 'error', message: 'User do not have access to the specified file.' });
    }

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
      const contact = new Contact({name,email,message})
      await contact.save()
      res.status(201).json({ status: 'success', message: 'Email sent successfully' });
    })
    .catch(error => {
      console.error('Error sending welcome email:', error)
      res.status(500).json({ status: 'error', message: 'Error sending welcome email' });
    });
}

