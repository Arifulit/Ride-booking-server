const express = require('express');
const authController = require('./auth.controller');
const { validateBody } = require('../../middlewares/validation.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Validation schemas
const registerSchema = require('./schemas/register.schema');
const loginSchema = require('./schemas/login.schema');

// Public routes
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getProfile);
router.patch('/profile', authenticate, authController.updateProfile);

module.exports = router;