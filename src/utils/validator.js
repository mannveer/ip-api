import { check, validationResult, body } from 'express-validator';

export const userSignupValidationRules = () => {
  return [
    check('email', 'Email is not valid').isEmail(),
    check('name', 'Name is required').not().isEmpty(),
    check('name', 'Name cannot exceed 50 characters').isLength({ max: 50 }),
    // check('password', 'Password must be at least 8 characters long').isLength({ min: 8 }),
    // check('passwordConfirm', 'Passwords do not match').custom((value, { req }) => value === req.body.password)
  ];
};

export const validateInsertUser = () => {
  return [
    body('name')
      .exists({ checkFalsy: true })
      .withMessage('Name is required')
      .isString()
      .withMessage('Name must be a string'),
    
    body('email')
      .exists({ checkFalsy: true })
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Must be a valid email'),
    
    body('purchase').exists().withMessage('Purchase object is required'),
    
    // Validate nested properties in purchase object
    body('purchase.fileid')
      .exists({ checkFalsy: true })
      .withMessage('File ID is required'),
    
    body('purchase.amount')
      .exists({ checkFalsy: true })
      .withMessage('Amount is required')
      .isNumeric()
      .withMessage('Amount must be a number'),
    
    body('purchase.currency')
      .exists({ checkFalsy: true })
      .withMessage('Currency is required')
      .isIn(['INR', 'USD', 'EUR'])
      .withMessage('Currency must be INR, USD, or EUR'),
    
    body('purchase.paymentid')
      .exists({ checkFalsy: true })
      .withMessage('Payment ID is required'),
    
    body('purchase.status')
      .exists({ checkFalsy: true })
      .withMessage('Status is required')
      .equals('success')
      .withMessage('Status must be success'),
    
    body('purchase.orderid')
      .exists({ checkFalsy: true })
      .withMessage('Order ID is required'),
  ];
};


export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
