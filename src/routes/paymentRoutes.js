import { createOrder,verifyPayment } from "../controllers/paymentController.js";
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/createorder",protect, createOrder);
router.post("/verifypayment",protect, verifyPayment);

export default router;