const Ride = require('./ride.model');
const Driver = require('../driver/driver.model');
const rideService = require('./ride.service');
const ResponseUtils = require('../../utils/response');

class RideController {
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
        duration: { estimated: estimates.duration }
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

    // শুধু requested/accepted ride-ই reject করা যাবে
    const ride = await Ride.findOne({ _id: rideId, status: { $in: ['requested', 'accepted'] } });
    if (!ride) {
      return ResponseUtils.error(res, 'Ride not found or already processed', 404);
    }

    // ড্রাইভার accept করে থাকলে, শুধু সেই ড্রাইভারই reject করতে পারবে
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
   * Update ride status (Driver)
   */
  static async updateRideStatus(req, res) {
    try {
      const { rideId } = req.params;
      const { status } = req.body;
      const driverId = req.user._id;

      const validStatuses = ['picked_up', 'in_transit', 'completed'];
      if (!validStatuses.includes(status)) {
        return ResponseUtils.error(res, 'Invalid status', 400);
      }

      const ride = await Ride.findOne({ 
        _id: rideId, 
        driverId,
        status: { $ne: 'completed' }
      });

      if (!ride) {
        return ResponseUtils.error(res, 'Ride not found or not authorized', 404);
      }

      // Validate status transition
      const validTransitions = {
        'accepted': ['picked_up'],
        'picked_up': ['in_transit'],
        'in_transit': ['completed']
      };

      if (!validTransitions[ride.status]?.includes(status)) {
        return ResponseUtils.error(res, `Cannot change status from ${ride.status} to ${status}`, 400);
      }

      // Update ride status
      await ride.updateStatus(status);

      // If completed, update driver earnings
      if (status === 'completed') {
        const driver = await Driver.findOne({ userId: driverId });
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
   * Get pending rides for driver
   */
  static async getPendingRides(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const rides = await Ride.find({ 
        status: 'requested',
        driverId: null 
      })
      .populate('riderId', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      const total = await Ride.countDocuments({ 
        status: 'requested',
        driverId: null 
      });

      ResponseUtils.paginated(res, rides, {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRides: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }, 'Pending rides retrieved successfully');

    } catch (error) {
      console.error('Get pending rides error:', error);
      ResponseUtils.error(res, 'Failed to retrieve pending rides', 500);
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
      const { reason } = req.body;
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
      const { rating, feedback } = req.body;
      const riderId = req.user._id;

      if (rating < 1 || rating > 5) {
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

      if (ride.rating.driverRating) {
        return ResponseUtils.error(res, 'Ride already rated', 409);
      }

      // Update ride rating
      ride.rating.driverRating = rating;
      if (feedback) ride.notes = feedback;
      await ride.save();

      // Update driver's overall rating
      const driver = await Driver.findById(ride.driverProfileId);
      if (driver) {
        const newCount = driver.rating.count + 1;
        const newAverage = ((driver.rating.average * driver.rating.count) + rating) / newCount;
        
        driver.rating.average = Math.round(newAverage * 10) / 10; // Round to 1 decimal
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