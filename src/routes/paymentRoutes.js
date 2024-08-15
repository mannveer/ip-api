import { createOrder,verifyPayment } from "../controllers/paymentController.js";
import express from "express";
const router = express.Router();

router.post("/createorder", createOrder);
router.post("/verifypayment", verifyPayment);

export default router;