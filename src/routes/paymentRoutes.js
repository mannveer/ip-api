import { createOrder,isPaymentSuccess,verifyPayment } from "../controllers/paymentController.js";
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/createorder",protect, createOrder);
router.post("/verifypayment",protect, verifyPayment);
router.get("/status", isPaymentSuccess);

export default router;