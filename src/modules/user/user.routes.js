const express = require('express');
const userController = require('./user.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// User profile routes
router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);

// Rider-specific routes
router.get('/rides/history', authorize(['rider']), userController.getRideHistory);

module.exports = router;