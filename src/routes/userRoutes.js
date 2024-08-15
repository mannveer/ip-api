import express from 'express';
import { insertUser,getUserDetails, emailFile, sendContactEmail } from '../controllers/userController.js';
import { userSignupValidationRules, validate } from '../utils/validator.js';
// import * as authController from '../controllers/authController';

const router = express.Router();

router.post('/insert', userSignupValidationRules(), validate, insertUser);
// router.get('/info/:name/:email/:otp', userSignupValidationRules(), validate, getUserDetails)
router.get('/info', userSignupValidationRules(), validate, getUserDetails)
router.post('/emailfile', emailFile)
router.post('/send-contact-email',sendContactEmail)

export default router;
