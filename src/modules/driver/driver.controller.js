const Driver = require('./driver.model');
const Ride = require('../ride/ride.model');
const ResponseUtils = require('../../utils/response');

class DriverController {
  /**
   * Get driver profile
   */
  static async getProfile(req, res) {
    try {
      const driver = await Driver.findOne({ userId: req.user._id })
        .populate('userId', '-password');

      if (!driver) {
        return ResponseUtils.error(res, 'Driver profile not found', 404);
      }

      ResponseUtils.success(res, { driver }, 'Driver profile retrieved successfully');
    } catch (error) {
      console.error('Get driver profile error:', error);
      ResponseUtils.error(res, 'Failed to retrieve driver profile', 500);
    }
  }

  /**
   * Update driver profile
   */
  static async updateProfile(req, res) {
    try {
      const allowedUpdates = ['vehicleInfo', 'documentsUploaded'];
      const updates = {};

      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      const driver = await Driver.findOneAndUpdate(
        { userId: req.user._id },
        updates,
        { new: true, runValidators: true }
      ).populate('userId', '-password');

      ResponseUtils.success(res, { driver }, 'Driver profile updated successfully');
    } catch (error) {
      console.error('Update driver profile error:', error);
      ResponseUtils.error(res, error.message || 'Failed to update driver profile', 500);
    }
  }

  /**
   * Update driver availability
   */
  static async updateAvailability(req, res) {
    try {
      const { isOnline } = req.body;
      
      const driver = await Driver.findOneAndUpdate(
        { userId: req.user._id },
        { isOnline: Boolean(isOnline) },
        { new: true }
      );

      if (!driver) {
        return ResponseUtils.error(res, 'Driver profile not found', 404);
      }

      ResponseUtils.success(res, { 
        isOnline: driver.isOnline 
      }, `Driver is now ${driver.isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Update availability error:', error);
      ResponseUtils.error(res, 'Failed to update availability', 500);
    }
  }

  /**
   * Update driver location
   */
  static async updateLocation(req, res) {
    try {
      const { longitude, latitude } = req.body;

      if (!longitude || !latitude) {
        return ResponseUtils.error(res, 'Longitude and latitude are required', 400);
      }

      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
        return ResponseUtils.error(res, 'Driver profile not found', 404);
      }

      await driver.updateLocation(longitude, latitude);

      ResponseUtils.success(res, {
        location: driver.currentLocation
      }, 'Location updated successfully');
    } catch (error) {
      console.error('Update location error:', error);
      ResponseUtils.error(res, 'Failed to update location', 500);
    }
  }

  /**
   * Get pending ride requests for driver
   */
  static async getPendingRides(req, res) {
    try {
      const driver = req.driver;
      const { page = 1, limit = 10 } = req.query;

      // Find rides near driver's location (simplified - in production use proper geo queries)
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
   * Get driver earnings summary
   */
  static async getEarnings(req, res) {
    try {
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
        return ResponseUtils.error(res, 'Driver profile not found', 404);
      }

      // Get completed rides count
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
   * Get detailed earnings breakdown
   */
  static async getDetailedEarnings(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const matchConditions = {
        driverId: req.user._id,
        status: 'completed'
      };

      if (startDate || endDate) {
        matchConditions.createdAt = {};
        if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
        if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
      }

      const earnings = await Ride.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$fare.actual' },
            totalRides: { $sum: 1 },
            averageFare: { $avg: '$fare.actual' }
          }
        }
      ]);

      const result = earnings[0] || {
        totalEarnings: 0,
        totalRides: 0,
        averageFare: 0
      };

      ResponseUtils.success(res, result, 'Detailed earnings retrieved successfully');
    } catch (error) {
      console.error('Get detailed earnings error:', error);
      ResponseUtils.error(res, 'Failed to retrieve detailed earnings', 500);
    }
  }
}

module.exports = DriverController;