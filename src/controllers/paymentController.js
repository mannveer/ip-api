import Razorpay from 'razorpay';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { isPaymentSuccessCheck } from '../services/paymentService.js';
import configs from '../config/index.js';


const razorpay = new Razorpay({
  key_id: configs.razorpay.key_id,
  key_secret: configs.razorpay.key_secret,
});


export const createOrder = async (req, res) => {
  try {
    console.log('Create order request:', req.body);
    const { amount, currency, receipt } = req.body;
    const options = {
      amount,
      currency,
      receipt,
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
};

export const verifyPayment = (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const generatedSignature = crypto
    .createHmac('sha256', configs.razorpay.key_secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature === razorpay_signature) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: 'Payment verification failed' });
  }
};

export const isPaymentSuccess = async (req, res) => {
  try {
    logger.info('Inside isPaymentSuccess and Fetching payment:', req.query);
    const { razorpay_payment_id, email, file } = req.query;
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    const isPaymentSuccess = await isPaymentSuccessCheck(email, payment.order_id, file);
    if (payment.status === 'captured' && isPaymentSuccess) {
      res.json({ success: true, payment });
    }
  } catch (error) {
    logger.error('Error fetching payment:', error);
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: error.message });
  }
}
