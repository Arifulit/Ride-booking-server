const express = require('express');
const driverController = require('./driver.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize, requireApprovedDriver } = require('../../middlewares/role.middleware');
const { validateBody, validateParams } = require('../../middlewares/validation.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Driver profile routes
router.get('/profile', authorize(['driver']), driverController.getProfile);
router.patch('/profile', authorize(['driver']), driverController.updateProfile);

// Driver availability
router.patch('/availability', authorize(['driver']), driverController.updateAvailability);
router.patch('/location', authorize(['driver']), driverController.updateLocation);

// Ride management for drivers
router.get('/rides/pending', requireApprovedDriver, driverController.getPendingRides);
router.get('/rides/active', authorize(['driver']), driverController.getActiveRide);
router.get('/rides/history', authorize(['driver']), driverController.getRideHistory);

// Earnings
router.get('/earnings', authorize(['driver']), driverController.getEarnings);
router.get('/earnings/detailed', authorize(['driver']), driverController.getDetailedEarnings);

module.exports = router;