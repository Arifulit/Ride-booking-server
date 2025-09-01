const User = require('../user/user.model');
const Driver = require('../driver/driver.model');
const Ride = require('../ride/ride.model');
const ResponseUtils = require('../../utils/response');

class AdminController {
  /**
   * Get all users with pagination
   */
  static async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, role, search } = req.query;
      
      let query = {};
      if (role && ['admin', 'rider', 'driver'].includes(role)) {
        query.role = role;
      }
      
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await User.countDocuments(query);

      ResponseUtils.paginated(res, users, {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }, 'Users retrieved successfully');

    } catch (error) {
      console.error('Get all users error:', error);
      ResponseUtils.error(res, 'Failed to retrieve users', 500);
    }
  }

  /**
   * Block a user
   */
  static async blockUser(req, res) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        { isBlocked: true },
        { new: true }
      ).select('-password');

      if (!user) {
        return ResponseUtils.error(res, 'User not found', 404);
      }

      ResponseUtils.success(res, { user }, 'User blocked successfully');

    } catch (error) {
      console.error('Block user error:', error);
      ResponseUtils.error(res, 'Failed to block user', 500);
    }
  }

  /**
   * Unblock a user
   */
  static async unblockUser(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByIdAndUpdate(
        userId,
        { isBlocked: false },
        { new: true }
      ).select('-password');

      if (!user) {
        return ResponseUtils.error(res, 'User not found', 404);
      }

      ResponseUtils.success(res, { user }, 'User unblocked successfully');

    } catch (error) {
      console.error('Unblock user error:', error);
      ResponseUtils.error(res, 'Failed to unblock user', 500);
    }
  }

  /**
   * Get all drivers with pagination
   */
  static async getAllDrivers(req, res) {
    try {
      const { page = 1, limit = 10, status, search } = req.query;
      
      let query = {};
      if (status && ['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
        query.approvalStatus = status;
      }

      const drivers = await Driver.find(query)
        .populate('userId', 'firstName lastName email phone isBlocked')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Apply search filter after population if needed
      let filteredDrivers = drivers;
      if (search) {
        filteredDrivers = drivers.filter(driver => 
          driver.userId.firstName.toLowerCase().includes(search.toLowerCase()) ||
          driver.userId.lastName.toLowerCase().includes(search.toLowerCase()) ||
          driver.userId.email.toLowerCase().includes(search.toLowerCase()) ||
          driver.licenseNumber.toLowerCase().includes(search.toLowerCase())
        );
      }

      const total = await Driver.countDocuments(query);

      ResponseUtils.paginated(res, filteredDrivers, {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalDrivers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }, 'Drivers retrieved successfully');

    } catch (error) {
      console.error('Get all drivers error:', error);
      ResponseUtils.error(res, 'Failed to retrieve drivers', 500);
    }
  }

  /**
   * Get pending driver applications
   */
  static async getPendingDrivers(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const drivers = await Driver.find({ approvalStatus: 'pending' })
        .populate('userId', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Driver.countDocuments({ approvalStatus: 'pending' });

      ResponseUtils.paginated(res, drivers, {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalDrivers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }, 'Pending drivers retrieved successfully');

    } catch (error) {
      console.error('Get pending drivers error:', error);
      ResponseUtils.error(res, 'Failed to retrieve pending drivers', 500);
    }
  }

  /**
   * Approve a driver
   */
  static async approveDriver(req, res) {
    try {
      const { driverId } = req.params;
      const { notes } = req.body;

      const driver = await Driver.findByIdAndUpdate(
        driverId,
        { 
          approvalStatus: 'approved',
          approvalNotes: notes || 'Approved by admin'
        },
        { new: true }
      ).populate('userId', 'firstName lastName email phone');

      if (!driver) {
        return ResponseUtils.error(res, 'Driver not found', 404);
      }

      ResponseUtils.success(res, { driver }, 'Driver approved successfully');

    } catch (error) {
      console.error('Approve driver error:', error);
      ResponseUtils.error(res, 'Failed to approve driver', 500);
    }
  }

  /**
   * Reject a driver
   */
  static async rejectDriver(req, res) {
    try {
      const { driverId } = req.params;
      const { reason } = req.body;

      const driver = await Driver.findByIdAndUpdate(
        driverId,
        { 
          approvalStatus: 'rejected',
          approvalNotes: reason || 'Rejected by admin'
        },
        { new: true }
      ).populate('userId', 'firstName lastName email phone');

      if (!driver) {
        return ResponseUtils.error(res, 'Driver not found', 404);
      }

      ResponseUtils.success(res, { driver }, 'Driver application rejected');

    } catch (error) {
      console.error('Reject driver error:', error);
      ResponseUtils.error(res, 'Failed to reject driver', 500);
    }
  }

  /**
   * Suspend a driver
   */
  static async suspendDriver(req, res) {
    try {
      const { driverId } = req.params;
      const { reason } = req.body;

      const driver = await Driver.findByIdAndUpdate(
        driverId,
        { 
          approvalStatus: 'suspended',
          isOnline: false,
          approvalNotes: reason || 'Suspended by admin'
        },
        { new: true }
      ).populate('userId', 'firstName lastName email phone');

      if (!driver) {
        return ResponseUtils.error(res, 'Driver not found', 404);
      }

      ResponseUtils.success(res, { driver }, 'Driver suspended successfully');

    } catch (error) {
      console.error('Suspend driver error:', error);
      ResponseUtils.error(res, 'Failed to suspend driver', 500);
    }
  }

  /**
   * Get all rides with pagination
   */
  static async getAllRides(req, res) {
    try {
      const { page = 1, limit = 10, status, riderId, driverId } = req.query;
      
      let query = {};
      if (status) query.status = status;
      if (riderId) query.riderId = riderId;
      if (driverId) query.driverId = driverId;

      const rides = await Ride.find(query)
        .populate('riderId', 'firstName lastName email phone')
        .populate('driver', 'firstName lastName email phone')
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
      console.error('Get all rides error:', error);
      ResponseUtils.error(res, 'Failed to retrieve rides', 500);
    }
  }

  /**
   * Get ride statistics
   */
  static async getRideStats(req, res) {
    try {
      const { period = 'month' } = req.query;

      // Calculate date range
      const now = new Date();
      let startDate;
      
      if (period === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (period === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const stats = await Ride.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalFare: { $sum: '$fare.actual' }
          }
        }
      ]);

      const totalRides = await Ride.countDocuments({ createdAt: { $gte: startDate } });
      const totalRevenue = await Ride.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$fare.actual' } } }
      ]);

      ResponseUtils.success(res, {
        period,
        totalRides,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusBreakdown: stats
      }, 'Ride statistics retrieved successfully');

    } catch (error) {
      console.error('Get ride stats error:', error);
      ResponseUtils.error(res, 'Failed to retrieve ride statistics', 500);
    }
  }

  /**
   * Get system overview
   */
  static async getSystemOverview(req, res) {
    try {
      // Get counts
      const totalUsers = await User.countDocuments();
      const totalRiders = await User.countDocuments({ role: 'rider' });
      const totalDrivers = await Driver.countDocuments();
      const totalRides = await Ride.countDocuments();
      const activeRides = await Ride.countDocuments({ 
        status: { $in: ['requested', 'accepted', 'picked_up', 'in_transit'] } 
      });
      const onlineDrivers = await Driver.countDocuments({ 
        isOnline: true,
        approvalStatus: 'approved'
      });

      // Get pending items
      const pendingDriverApprovals = await Driver.countDocuments({ approvalStatus: 'pending' });

      // Recent activity
      const recentRides = await Ride.find()
        .populate('riderId', 'firstName lastName')
        .populate('driver', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5);

      ResponseUtils.success(res, {
        overview: {
          totalUsers,
          totalRiders,
          totalDrivers,
          totalRides,
          activeRides,
          onlineDrivers,
          pendingDriverApprovals
        },
        recentActivity: recentRides
      }, 'System overview retrieved successfully');

    } catch (error) {
      console.error('Get system overview error:', error);
      ResponseUtils.error(res, 'Failed to retrieve system overview', 500);
    }
  }

  /**
   * Get earnings report
   */
  static async getEarningsReport(req, res) {
    try {
      const { period = 'month' } = req.query;

      const now = new Date();
      let startDate;
      
      if (period === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (period === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const earningsData = await Ride.aggregate([
        { 
          $match: { 
            status: 'completed',
            createdAt: { $gte: startDate }
          } 
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$fare.actual' },
            totalRides: { $sum: 1 },
            averageFare: { $avg: '$fare.actual' },
            totalDistance: { $sum: '$distance.actual' }
          }
        }
      ]);

      const result = earningsData[0] || {
        totalRevenue: 0,
        totalRides: 0,
        averageFare: 0,
        totalDistance: 0
      };

      ResponseUtils.success(res, {
        period,
        ...result
      }, 'Earnings report retrieved successfully');

    } catch (error) {
      console.error('Get earnings report error:', error);
      ResponseUtils.error(res, 'Failed to retrieve earnings report', 500);
    }
  }
}

module.exports = AdminController;