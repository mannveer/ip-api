import { constants } from "../utils/constant.js";
import EmailService from "../services/email/emailService.js";
import userService from '../services/userService.js';

export const insertUser = async (req, res, next) => {
  try {
    const { email,name,purchase } = req.body;

    if(!email || !name ){
      return res.status(400).json({ status: 'error', message: 'Email and Name is required' });
    }

    const { user,token } = await userService.inserData({ email,name,purchase });

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
    const { email,name } = req.query;

    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Email and Name is required' });
    }

    const user = await userService.getDetails({ email });
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
      await userService.saveContactUser({email,name,message});
      res.status(201).json({ status: 'success', message: 'Email sent successfully' });
    })
    .catch(error => {
      console.error('Error sending welcome email:', error)
      res.status(500).json({ status: 'error', message: 'Error sending welcome email' });
    });
}

