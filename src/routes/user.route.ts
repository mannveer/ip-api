import express from 'express';
import UserController from '../controllers/user.controller';
import { userSignupValidationRules, validate, validateInsertUser } from '../utils/validator';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Route definitions with proper controller methods
router.post('/insert', protect, validateInsertUser(), validate, UserController.insertUser);
router.get('/info', protect, userSignupValidationRules(), validate, UserController.getUserDetails);
router.post('/emailfile', protect, UserController.emailFile);
router.post('/send-contact-email', UserController.sendContactEmail);
router.get('/session', protect, async (req, res) => {
    res.status(200).json({ msg: "session active" });
});

export default router;
