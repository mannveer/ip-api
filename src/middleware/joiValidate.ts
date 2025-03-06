import Joi from 'joi';

/**
 * Middleware factory that validates a property of the request object using the provided Joi schema.
 * @param {Joi.Schema} schema - Joi schema to validate against.
 * @param {string} property - Request property to validate (default is 'body').
 * @returns {function} Express middleware function.
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false });
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({ status: 'error', message });
    }
    next();
  };
};
