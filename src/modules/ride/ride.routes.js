const express = require('express');
const rideController = require('./ride.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize, requireApprovedDriver } = require('../../middlewares/role.middleware');
const { validateBody, validateParams } = require('../../middlewares/validation.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Ride request (Riders only)
router.post('/request', authorize(['rider']), rideController.requestRide);

// Ride management (Riders)
router.get('/my-rides', authorize(['rider']), rideController.getMyRides);
router.patch('/:rideId/cancel', authorize(['rider']), rideController.cancelRide);
router.patch('/:rideId/rate', authorize(['rider']), rideController.rateDriver);

// Ride management (Drivers)
router.patch('/:rideId/accept', requireApprovedDriver, rideController.acceptRide);
router.patch('/:rideId/reject', requireApprovedDriver, rideController.rejectRide);
router.patch('/:rideId/status', authorize(['driver']), rideController.updateRideStatus);

// Shared routes
router.get('/:rideId', rideController.getRideDetails);

module.exports = router;