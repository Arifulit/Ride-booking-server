const { z } = require('zod');
const ResponseUtils = require('../utils/response');

/**
 * Validate request body using Zod schema
 * @param {Object} schema - Zod validation schema
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      const errors = err.errors?.map(e => ({
        field: e.path.join('.'),
        message: e.message
      })) || [{ message: err.message }];
      return ResponseUtils.error(res, 'Validation failed', 400, errors);
    }
  };
};

/**
 * Validate request query parameters using Zod schema
 * @param {Object} schema - Zod validation schema
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      const errors = err.errors?.map(e => ({
        field: e.path.join('.'),
        message: e.message
      })) || [{ message: err.message }];
      return ResponseUtils.error(res, 'Query validation failed', 400, errors);
    }
  };
};

/**
 * Validate request parameters using Zod schema
 * @param {Object} schema - Zod validation schema
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      const errors = err.errors?.map(e => ({
        field: e.path.join('.'),
        message: e.message
      })) || [{ message: err.message }];
      return ResponseUtils.error(res, 'Parameter validation failed', 400, errors);
    }
  };
};

module.exports = { validateBody, validateQuery, validateParams };