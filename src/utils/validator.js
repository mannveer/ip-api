import { check, validationResult } from 'express-validator';

export const userSignupValidationRules = () => {
  return [
    check('email', 'Email is not valid').isEmail(),
    check('name', 'Name is required').not().isEmpty(),
    check('name', 'Name cannot exceed 50 characters').isLength({ max: 50 }),
    // check('password', 'Password must be at least 8 characters long').isLength({ min: 8 }),
    // check('passwordConfirm', 'Passwords do not match').custom((value, { req }) => value === req.body.password)
  ];
};

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
