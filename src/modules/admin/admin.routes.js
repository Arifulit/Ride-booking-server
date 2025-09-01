const express = require('express');
const adminController = require('./admin.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validateParams, validateQuery } = require('../../middlewares/validation.middleware');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['admin']));

// User management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/block', adminController.blockUser);
router.patch('/users/:userId/unblock', adminController.unblockUser);

// Driver management
router.get('/drivers', adminController.getAllDrivers);
router.get('/drivers/pending', adminController.getPendingDrivers);
router.patch('/drivers/:driverId/approve', adminController.approveDriver);
router.patch('/drivers/:driverId/reject', adminController.rejectDriver);
router.patch('/drivers/:driverId/suspend', adminController.suspendDriver);

// Ride management
router.get('/rides', adminController.getAllRides);
router.get('/rides/stats', adminController.getRideStats);

// System reports
router.get('/reports/overview', adminController.getSystemOverview);
router.get('/reports/earnings', adminController.getEarningsReport);

module.exports = router;