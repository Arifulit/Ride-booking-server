const User = require('./user.model');
const Ride = require('../ride/ride.model');
const ResponseUtils = require('../../utils/response');

class UserController {
  /**
   * Get user profile
   */
  static async getProfile(req, res) {
    try {
      const user = req.user;
      ResponseUtils.success(res, { user: user.getPublicProfile() }, 'Profile retrieved successfully');
    } catch (error) {
      console.error('Get profile error:', error);
      ResponseUtils.error(res, 'Failed to retrieve profile', 500);
    }
  }

  static  getAllUsers = async (req, res) => {
  try {
    const users = await require('./user.model').find().select('-password');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

  /**
   * Update user profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const allowedUpdates = ['firstName', 'lastName', 'phone', 'profilePicture'];
      const updates = {};

      // Filter allowed updates
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updates,
        { new: true, runValidators: true }
      );

      ResponseUtils.success(res, {
        user: updatedUser.getPublicProfile()
      }, 'Profile updated successfully');

    } catch (error) {
      console.error('Update profile error:', error);
      ResponseUtils.error(res, error.message || 'Failed to update profile', 500);
    }
  }

  /**
   * Get ride history for riders
   */
  static async getRideHistory(req, res) {
    try {
      const riderId = req.user._id;
      const { page = 1, limit = 10, status } = req.query;

      const query = { riderId };
      if (status) {
        query.status = status;
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: [
          { path: 'driver', select: 'firstName lastName phone' },
          { path: 'driverProfile', select: 'vehicleInfo rating' }
        ]
      };

      const rides = await Ride.paginate(query, options);

      ResponseUtils.paginated(res, rides.docs, {
        currentPage: rides.page,
        totalPages: rides.totalPages,
        totalRides: rides.totalDocs,
        hasNext: rides.hasNextPage,
        hasPrev: rides.hasPrevPage
      }, 'Ride history retrieved successfully');

    } catch (error) {
      console.error('Get ride history error:', error);
      ResponseUtils.error(res, 'Failed to retrieve ride history', 500);
    }
  }
}

module.exports = UserController;