const razorpay = new Razorpay({
    key_id: 'YOUR_RAZORPAY_KEY_ID',
    key_secret: 'YOUR_RAZORPAY_KEY_SECRET'
  });
  
  app.post('/create-order', async (req, res) => {
    const options = {
      amount: req.body.amount * 100, // amount in the smallest currency unit
      currency: 'INR',
      receipt: 'receipt#1'
    };
    try {
      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (error) {
      res.status(500).send(error);
    }
  });
  
  app.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', 'YOUR_RAZORPAY_KEY_SECRET');
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');
    if (generated_signature === razorpay_signature) {
      res.json({ status: 'success' });
    } else {
      res.status(400).json({ status: 'failure' });
    }
  });