import express from 'express';
import { insertUser, getUserDetails, emailFile, sendContactEmail } from '../controllers/userController.js';
import { userSignupValidationRules, validate } from '../utils/validator.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/insert', protect, userSignupValidationRules(), validate, insertUser);
router.get('/info',protect, userSignupValidationRules(), validate, getUserDetails);
router.post('/emailfile',protect, emailFile);
router.post('/send-contact-email', sendContactEmail);
router.get('/session', protect, async (req, res) => {
    res.status(200).json({ msg: "session active" });
});

export default router;
