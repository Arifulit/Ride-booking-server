const Joi = require('joi');

const registerSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
  
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'any.required': 'Password is required'
    }),
  
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please enter a valid phone number',
      'any.required': 'Phone number is required'
    }),
  
  role: Joi.string()
    .valid('rider', 'driver')
    .default('rider')
    .messages({
      'any.only': 'Role must be either rider or driver'
    }),

  // Driver-specific fields (required only if role is driver)
  licenseNumber: Joi.when('role', {
    is: 'driver',
    then: Joi.string().required().messages({
      'any.required': 'License number is required for drivers'
    }),
    otherwise: Joi.forbidden()
  }),

  vehicleInfo: Joi.when('role', {
    is: 'driver',
    then: Joi.object({
      make: Joi.string().required(),
      model: Joi.string().required(),
      year: Joi.number().min(1990).max(new Date().getFullYear() + 1).required(),
      color: Joi.string().required(),
      plateNumber: Joi.string().required()
    }).required(),
    otherwise: Joi.forbidden()
  })
});

module.exports = registerSchema;