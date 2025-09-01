const Joi = require('joi');
const ResponseUtils = require('../utils/response');

/**
 * Validate request body using Joi schema
 * @param {Object} schema - Joi validation schema
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return ResponseUtils.error(res, 'Validation failed', 400, errors);
    }
    
    req.body = value;
    next();
  };
};

/**
 * Validate request query parameters
 * @param {Object} schema - Joi validation schema
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return ResponseUtils.error(res, 'Query validation failed', 400, errors);
    }
    
    req.query = value;
    next();
  };
};

/**
 * Validate request parameters
 * @param {Object} schema - Joi validation schema
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return ResponseUtils.error(res, 'Parameter validation failed', 400, errors);
    }
    
    req.params = value;
    next();
  };
};

module.exports = { validateBody, validateQuery, validateParams };