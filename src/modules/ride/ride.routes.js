const asyncHandler = require('express-async-handler');
const express = require('express');
const rideController = require('./ride.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize, requireApprovedDriver } = require('../../middlewares/role.middleware');
const { validateBody, validateParams } = require('../../middlewares/validation.middleware');

const router = express.Router();

// Geo-based driver search
router.post('/search-drivers', authenticate, authorize(['rider', 'admin']), rideController.searchNearbyDrivers);

// All routes require authentication
router.use(authenticate);

// Ride fare estimation (authenticated, public)
router.post('/estimate', rideController.estimateFare);

// Ride request (Riders only)
router.post('/request', authorize(['rider']), rideController.requestRide);

// Ride management (Riders)
router.get('/my-rides', authorize(['rider']), rideController.getMyRides);
router.patch('/:rideId/cancel', authorize(['rider']), rideController.cancelRide);
router.patch('/:rideId/rate', authorize(['rider']), rideController.rateDriver);

// Ride management (Drivers)
router.patch('/:rideId/accept', asyncHandler(requireApprovedDriver), rideController.acceptRide);
router.patch('/:rideId/reject', asyncHandler(requireApprovedDriver), rideController.rejectRide);
router.patch('/:rideId/status', authorize(['driver']), rideController.updateRideStatus);

// Shared routes
router.get('/:rideId', rideController.getRideDetails);
// admin
router.get('/history/all', authorize(['admin']), rideController.getAllRidesHistory);
// Admin dashboard analytics
router.get('/admin/analytics', authorize(['admin']), rideController.getAdminAnalytics);

module.exports = router;