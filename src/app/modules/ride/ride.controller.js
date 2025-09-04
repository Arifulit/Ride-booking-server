const Ride = require('./ride.model');
const Driver = require('../driver/driver.model');
const rideService = require('./ride.service');
const ResponseUtils = require('../../utils/response');

class RideController {
  /**
   * Get all rides with full history (Admin)
   */
  static async getAllRidesHistory(req, res) {
    try {
      const rides = await Ride.find().sort({ createdAt: -1 });
      res.json({ success: true, rides });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch all rides history' });
    }
  }
  /**
   * Search nearby drivers (Geo-based search)
   * POST /api/v1/rides/search-drivers
   * Body: { longitude, latitude, radius }
   * Response: available drivers
   */
  static async searchNearbyDrivers(req, res) {
    try {
      const { longitude, latitude, radius = 10 } = req.body;
      if (typeof longitude !== 'number' || typeof latitude !== 'number') {
        return res.status(400).json({ success: false, message: 'longitude ও latitude লাগবে' });
      }
      const drivers = await require('./ride.service').findNearbyDrivers(longitude, latitude, radius);
      res.json({ success: true, drivers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message || 'Failed to search drivers' });
    }
  }
  /**
   * Admin dashboard analytics
   * GET /api/v1/rides/admin/analytics
   * Only admin can access
   */
  static async getAdminAnalytics(req, res) {
    try {
      const Ride = require('./ride.model');
      const User = require('../user/user.model');
      const Driver = require('../driver/driver.model');

      const [totalRides, completedRides, cancelledRides, activeRides, totalEarnings, totalUsers, totalDrivers] = await Promise.all([
        Ride.countDocuments(),
        Ride.countDocuments({ status: 'completed' }),
        Ride.countDocuments({ status: 'cancelled' }),
        Ride.countDocuments({ status: { $in: ['requested', 'accepted', 'picked_up', 'in_transit'] } }),
        Ride.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$fare.actual' } } }]),
        User.countDocuments(),
        Driver.countDocuments()
      ]);

      res.json({
        success: true,
        data: {
          totalRides,
          completedRides,
          cancelledRides,
          activeRides,
          totalEarnings: totalEarnings[0]?.total || 0,
          totalUsers,
          totalDrivers
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    }
  }
  /**
   * Ride fare estimation API
   * POST /api/v1/rides/estimate
   * Body: { pickupLocation, destination, rideType }
   * Response: { estimated fare, distance, duration }
   */
  static async estimateFare(req, res) {
    try {
      const { pickupLocation, destination, rideType = 'economy' } = req.body;
      if (!pickupLocation || !destination) {
        return ResponseUtils.error(res, 'pickupLocation ও destination লাগবে', 400);
      }
      // Estimate calculate
      const estimates = require('./ride.service').calculateEstimates(pickupLocation, destination, rideType);
      ResponseUtils.success(res, estimates, 'Estimated fare calculated');
    } catch (error) {
      console.error('Estimate fare error:', error);
      ResponseUtils.error(res, 'Failed to estimate fare', 500);
    }
  }
  /**
   * Request a new ride (Rider)
   */
  static async requestRide(req, res) {
    try {
      const riderId = req.user._id;
      const {
        pickupLocation,
        destination,
        rideType = 'economy',
        paymentMethod = 'cash',
        notes
      } = req.body;

      // Check if rider has any active rides
      const activeRide = await Ride.findOne({
        riderId,
        status: { $in: ['requested', 'accepted', 'picked_up', 'in_transit'] }
      });

      if (activeRide) {
        return ResponseUtils.error(res, 'You already have an active ride', 409);
      }


      // Calculate estimated fare and duration
      const estimates = rideService.calculateEstimates(pickupLocation, destination, rideType);

      // Create ride with default status 'requested'
      const ride = new Ride({
        riderId,
        pickupLocation,
        destination,
        rideType,
        paymentMethod,
        notes,
        fare: { estimated: estimates.fare },
        distance: { estimated: estimates.distance },
        duration: { estimated: estimates.duration }
        // status: 'requested' //  default
      });

      await ride.save();
      await ride.populate('riderId', 'firstName lastName phone');

      ResponseUtils.success(res, { ride }, 'Ride requested successfully', 201);

    } catch (error) {
      console.error('Request ride error:', error);
      ResponseUtils.error(res, error.message || 'Failed to request ride', 500);
    }
  }

  /**
   * Accept a ride (Driver)
   */
  static async acceptRide(req, res) {
    try {
      const { rideId } = req.params;
      const driverId = req.user._id;
      const driver = req.driver;

      // Check if driver has any active rides
      const activeRide = await Ride.findOne({
        driverId,
        status: { $in: ['accepted', 'picked_up', 'in_transit'] }
      });

      if (activeRide) {
        return ResponseUtils.error(res, 'You already have an active ride', 409);
      }

      // Find and update ride
      const ride = await Ride.findOne({ _id: rideId, status: 'requested' });
      if (!ride) {
        return ResponseUtils.error(res, 'Ride not found or already accepted', 404);
      }

      // Update ride with driver info
      ride.driverId = driverId;
      ride.driverProfileId = driver._id;
      await ride.updateStatus('accepted');

      await ride.populate([
        { path: 'riderId', select: 'firstName lastName phone' },
        { path: 'driverProfile', select: 'vehicleInfo' }
      ]);

      ResponseUtils.success(res, { ride }, 'Ride accepted successfully');

    } catch (error) {
      console.error('Accept ride error:', error);
      ResponseUtils.error(res, error.message || 'Failed to accept ride', 500);
    }
  }

 
static async rejectRide(req, res) {
  try {
    const { rideId } = req.params;
    const driverId = req.user._id;

        // Only rides in "requested" or "accepted" status can be rejected
    const ride = await Ride.findOne({ _id: rideId, status: { $in: ['requested', 'accepted'] } });
    if (!ride) {
      return ResponseUtils.error(res, 'Ride not found or already processed', 404);
    }


     // Only the driver assigned to the ride can reject it
    if (ride.driverId && ride.driverId.toString() !== driverId.toString()) {
      return ResponseUtils.error(res, 'Not authorized to reject this ride', 403);
    }

    ride.status = 'rejected';
    await ride.save();

    ResponseUtils.success(res, { ride }, 'Ride rejected successfully');
  } catch (error) {
    console.error('Reject ride error:', error);
    ResponseUtils.error(res, error.message || 'Failed to reject ride', 500);
  }
};

  /**
   * Update ride status (Driver or Admin)
   * Driver: can update only their own rides, and only valid transitions
   * Admin: can update any ride to any status (forcibly)
   */
  static async updateRideStatus(req, res) {
    try {
      const { rideId } = req.params;
      const { status } = req.body;
      const userId = req.user._id;
      const userRole = req.user.role;

      const validStatuses = ['picked_up', 'in_transit', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return ResponseUtils.error(res, 'Invalid status', 400);
      }

      // Admin can update any ride
      let ride;
      if (userRole === 'admin') {
        ride = await Ride.findOne({ _id: rideId });
        if (!ride) {
          return ResponseUtils.error(res, 'Ride not found', 404);
        }
      } else if (userRole === 'driver') {
        ride = await Ride.findOne({ _id: rideId, driverId: userId, status: { $ne: 'completed' } });
        if (!ride) {
          return ResponseUtils.error(res, 'Ride not found or not authorized', 404);
        }
        // Validate status transition for driver
        const validTransitions = {
          'accepted': ['picked_up'],
          'picked_up': ['in_transit'],
          'in_transit': ['completed']
        };
        if (!validTransitions[ride.status]?.includes(status)) {
          return ResponseUtils.error(res, `Cannot change status from ${ride.status} to ${status}`, 400);
        }
      } else {
        return ResponseUtils.error(res, 'Insufficient permissions', 403);
      }

      // Update ride status and timeline
      await ride.updateStatus(status, userRole);

      // If completed, update driver earnings
      if (status === 'completed' && ride.driverId) {
        const driver = await Driver.findOne({ userId: ride.driverId });
        if (driver) {
          driver.earnings.total += ride.fare.estimated;
          driver.earnings.thisMonth += ride.fare.estimated;
          await driver.save();
        }
        // Set actual fare (for now, same as estimated)
        ride.fare.actual = ride.fare.estimated;
        ride.distance.actual = ride.distance.estimated;
        ride.duration.actual = ride.duration.estimated;
        ride.paymentStatus = 'completed';
        await ride.save();
      }

      await ride.populate([
        { path: 'riderId', select: 'firstName lastName phone' },
        { path: 'driverProfile', select: 'vehicleInfo' }
      ]);

      ResponseUtils.success(res, { ride }, `Ride status updated to ${status}`);

    } catch (error) {
      console.error('Update ride status error:', error);
      ResponseUtils.error(res, error.message || 'Failed to update ride status', 500);
    }
  }

  /**
   * Admin: forcibly update any ride status (for admin panel)
   */
  static async requestRide(req, res) {
    try {
      const riderId = req.user._id;
      const {
        pickupLocation,
        destination,
        rideType = 'economy',
        paymentMethod = 'cash',
        notes
      } = req.body;

      // Check if rider has any active rides
      const activeRide = await Ride.findOne({
        riderId,
        status: { $in: ['requested', 'accepted', 'picked_up', 'in_transit'] }
      });

      if (activeRide) {
        return ResponseUtils.error(res, 'You already have an active ride', 409);
      }

      // Calculate estimated fare and duration
      const estimates = rideService.calculateEstimates(pickupLocation, destination, rideType);

      // Auto-match: geo-based nearest available driver
      let matchedDriver = null;
      const nearbyDrivers = await rideService.findNearbyDrivers(
        pickupLocation.coordinates.coordinates[0],
        pickupLocation.coordinates.coordinates[1],
        10 // radius in km
      );
      if (nearbyDrivers && nearbyDrivers.length > 0) {
        matchedDriver = nearbyDrivers[0];
      }

      // Create ride
      const ride = new Ride({
        riderId,
        pickupLocation,
        destination,
        rideType,
        paymentMethod,
        notes,
        fare: { estimated: estimates.fare },
        distance: { estimated: estimates.distance },
        duration: { estimated: estimates.duration },
        // Auto-match driverId, driverProfileId, status 'accepted'
        ...(matchedDriver ? {
          driverId: matchedDriver.userId,
          driverProfileId: matchedDriver._id,
          status: 'accepted',
          timeline: { requested: new Date(), accepted: new Date() }
        } : {})
      });

      await ride.save();
      await ride.populate('riderId', 'firstName lastName phone');
      if (matchedDriver) {
        await ride.populate('driverProfileId', 'vehicleInfo');
      }

      ResponseUtils.success(res, { ride, autoMatched: !!matchedDriver }, matchedDriver ? 'Ride auto-matched with driver' : 'Ride requested successfully', 201);

    } catch (error) {
      console.error('Request ride error:', error);
      ResponseUtils.error(res, error.message || 'Failed to request ride', 500);
    }
  }

  /**
   * Get driver's active ride
   */
  static async getActiveRide(req, res) {
    try {
      const activeRide = await Ride.findOne({
        driverId: req.user._id,
        status: { $in: ['accepted', 'picked_up', 'in_transit'] }
      }).populate('riderId', 'firstName lastName phone');

      ResponseUtils.success(res, { ride: activeRide }, 'Active ride retrieved successfully');
    } catch (error) {
      console.error('Get active ride error:', error);
      ResponseUtils.error(res, 'Failed to retrieve active ride', 500);
    }
  }

  /**
   * Get driver's ride history
   */
  static async getRideHistory(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      
      const query = { driverId: req.user._id };
      if (status) {
        query.status = status;
      }

      const rides = await Ride.find(query)
        .populate('riderId', 'firstName lastName phone')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Ride.countDocuments(query);

      ResponseUtils.paginated(res, rides, {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRides: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }, 'Ride history retrieved successfully');

    } catch (error) {
      console.error('Get ride history error:', error);
      ResponseUtils.error(res, 'Failed to retrieve ride history', 500);
    }
  }

  /**
   * Get driver earnings
   */
  static async getEarnings(req, res) {
    try {
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
        return ResponseUtils.error(res, 'Driver profile not found', 404);
      }

      const completedRides = await Ride.countDocuments({
        driverId: req.user._id,
        status: 'completed'
      });

      ResponseUtils.success(res, {
        earnings: driver.earnings,
        completedRides,
        rating: driver.rating
      }, 'Earnings retrieved successfully');

    } catch (error) {
      console.error('Get earnings error:', error);
      ResponseUtils.error(res, 'Failed to retrieve earnings', 500);
    }
  }

  /**
   * Get detailed earnings
   */
  static async getDetailedEarnings(req, res) {
    try {
      const { period = 'month' } = req.query;
      
      const matchConditions = {
        driverId: req.user._id,
        status: 'completed'
      };

      // Add date range based on period
      const now = new Date();
      if (period === 'today') {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        matchConditions.createdAt = { $gte: startOfDay };
      } else if (period === 'week') {
        const startOfWeek = new Date(now.setDate(now.getDate() - 7));
        matchConditions.createdAt = { $gte: startOfWeek };
      } else if (period === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        matchConditions.createdAt = { $gte: startOfMonth };
      }

      const earnings = await Ride.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$fare.actual' },
            totalRides: { $sum: 1 },
            averageFare: { $avg: '$fare.actual' },
            totalDistance: { $sum: '$distance.actual' }
          }
        }
      ]);

      const result = earnings[0] || {
        totalEarnings: 0,
        totalRides: 0,
        averageFare: 0,
        totalDistance: 0
      };

      ResponseUtils.success(res, { 
        period,
        ...result 
      }, 'Detailed earnings retrieved successfully');

    } catch (error) {
      console.error('Get detailed earnings error:', error);
      ResponseUtils.error(res, 'Failed to retrieve detailed earnings', 500);
    }
  }

  /**
   * Cancel a ride (Rider)
   */
  static async cancelRide(req, res) {
    try {
      const { rideId } = req.params;
      const { reason } = req.body || {};
      const riderId = req.user._id;

      const ride = await Ride.findOne({ _id: rideId, riderId });
      if (!ride) {
        return ResponseUtils.error(res, 'Ride not found', 404);
      }

      if (!ride.canBeCancelled()) {
        return ResponseUtils.error(res, 'Ride cannot be cancelled at this stage', 400);
      }

      ride.cancellationReason = reason || 'Cancelled by rider';
      await ride.updateStatus('cancelled', 'rider');

      ResponseUtils.success(res, { ride }, 'Ride cancelled successfully');

    } catch (error) {
      console.error('Cancel ride error:', error);
      ResponseUtils.error(res, error.message || 'Failed to cancel ride', 500);
    }
  }

  /**
   * Rate driver (Rider)
   */
  static async rateDriver(req, res) {
    try {
      const { rideId } = req.params;
      // riderRating, driverRating, rating 
      const { rating, riderRating, driverRating, feedback, riderComment, driverComment } = req.body;
      const riderId = req.user._id;

      // Determine the effective rating value
      const ratingValue = typeof riderRating === 'number' ? riderRating : (typeof driverRating === 'number' ? driverRating : rating);
      if (ratingValue < 1 || ratingValue > 5) {
        return ResponseUtils.error(res, 'Rating must be between 1 and 5', 400);
      }

      const ride = await Ride.findOne({ 
        _id: rideId, 
        riderId, 
        status: 'completed' 
      });

      if (!ride) {
        return ResponseUtils.error(res, 'Completed ride not found', 404);
      }

      // Check if already rated
      if (ride.rating.driverRating || ride.rating.riderRating) {
        return ResponseUtils.error(res, 'Ride already rated', 409);
      }

      // Set riderRating if available
      if (typeof riderRating === 'number') {
        ride.rating.riderRating = riderRating;
      }
      // Set driverRating if available
      if (typeof driverRating === 'number') {
        ride.rating.driverRating = driverRating;
      }
      // Set old rating field to driverRating if exists
      if (typeof rating === 'number') {
        ride.rating.driverRating = rating;
      }

      if (feedback) ride.notes = feedback;
      if (riderComment) {
        ride.feedback = ride.feedback || {};
        ride.feedback.riderComment = riderComment;
      }
      if (driverComment) {
        ride.feedback = ride.feedback || {};
        ride.feedback.driverComment = driverComment;
      }
      await ride.save();

      // Update driver's overall rating
      const driver = await Driver.findById(ride.driverProfileId);
      if (driver) {
        // new rating
        const prevCount = typeof driver.rating.count === 'number' ? driver.rating.count : 0;
        const prevAverage = typeof driver.rating.average === 'number' ? driver.rating.average : 0;
        const newCount = prevCount + 1;
        let newAverage = ((prevAverage * prevCount) + ratingValue) / newCount;
        // If NaN, set to 0
        if (isNaN(newAverage)) newAverage = 0;
        driver.rating.average = Math.round(newAverage * 10) / 10;
        driver.rating.count = newCount;
        await driver.save();
      }

      ResponseUtils.success(res, { ride }, 'Driver rated successfully');

    } catch (error) {
      console.error('Rate driver error:', error);
      ResponseUtils.error(res, error.message || 'Failed to rate driver', 500);
    }
  }

  /**
   * Get my rides (Rider)
   */
  static async getMyRides(req, res) {
    try {
      const riderId = req.user._id;
      const { page = 1, limit = 10, status } = req.query;

      const query = { riderId };
      if (status) {
        query.status = status;
      }

      const rides = await Ride.find(query)
        .populate('driver', 'firstName lastName phone')
        .populate('driverProfile', 'vehicleInfo rating')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Ride.countDocuments(query);

      ResponseUtils.paginated(res, rides, {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRides: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }, 'Rides retrieved successfully');

    } catch (error) {
      console.error('Get my rides error:', error);
      ResponseUtils.error(res, 'Failed to retrieve rides', 500);
    }
  }

  /**
   * Get ride details
   */
  static async getRideDetails(req, res) {
    try {
      const { rideId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      let query = { _id: rideId };

      // Restrict access based on role
      if (userRole === 'rider') {
        query.riderId = userId;
      } else if (userRole === 'driver') {
        query.driverId = userId;
      }
      // Admins can see all rides

      const ride = await Ride.findOne(query)
        .populate('riderId', 'firstName lastName phone')
        .populate('driver', 'firstName lastName phone')
        .populate('driverProfile', 'vehicleInfo rating');

      if (!ride) {
        return ResponseUtils.error(res, 'Ride not found', 404);
      }

      ResponseUtils.success(res, { ride }, 'Ride details retrieved successfully');

    } catch (error) {
      console.error('Get ride details error:', error);
      ResponseUtils.error(res, 'Failed to retrieve ride details', 500);
    }
  }
}

module.exports = RideController;