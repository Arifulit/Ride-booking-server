const User = require('../user/user.model');
const Driver = require('../driver/driver.model');
const authService = require('./auth.service');
const ResponseUtils = require('../../utils/response');

class AuthController {
  /**
   * Register a new user
   */
  static async register(req, res) {
    try {
      const { role, licenseNumber, vehicleInfo, ...userData } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        return ResponseUtils.error(res, 'User already exists with this email', 409);
      }

      // Create user
      const user = new User({ ...userData, role });
      await user.save();

      // If driver, create driver profile
      if (role === 'driver') {
        const driver = new Driver({
          userId: user._id,
          licenseNumber,
          vehicleInfo
        });
        await driver.save();
      }

      // Generate token
      const tokens = authService.generateTokens(user);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      ResponseUtils.success(res, {
        user: user.getPublicProfile(),
        tokens
      }, 'Registration successful', 201);

    } catch (error) {
      console.error('Registration error:', error);
      ResponseUtils.error(res, error.message || 'Registration failed', 500);
    }
  }

  /**
   * Login user
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return ResponseUtils.error(res, 'Invalid email or password', 401);
      }

      // Check if user is blocked
      if (user.isBlocked) {
        return ResponseUtils.error(res, 'Account has been blocked. Contact support.', 403);
      }

      // Verify password
      const isPasswordValid = await user.checkPassword(password);
      if (!isPasswordValid) {
        return ResponseUtils.error(res, 'Invalid email or password', 401);
      }

      // Generate tokens
      const tokens = authService.generateTokens(user);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Get additional info for drivers
      let additionalData = {};
      if (user.role === 'driver') {
        const driverProfile = await Driver.findOne({ userId: user._id });
        additionalData.driverProfile = driverProfile;
      }

      ResponseUtils.success(res, {
        user: user.getPublicProfile(),
        tokens,
        ...additionalData
      }, 'Login successful');

    } catch (error) {
      console.error('Login error:', error);
      ResponseUtils.error(res, 'Login failed', 500);
    }
  }

  /**
   * Logout user
   */
  static async logout(req, res) {
    try {
      // In a real application, you might want to blacklist the token
      // For now, we'll just send a success response
      ResponseUtils.success(res, null, 'Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      ResponseUtils.error(res, 'Logout failed', 500);
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req, res) {
    try {
      const user = req.user;
      let profileData = { user: user.getPublicProfile() };

      // Add driver-specific data if user is a driver
      if (user.role === 'driver') {
        const driverProfile = await Driver.findOne({ userId: user._id });
        profileData.driverProfile = driverProfile;
      }

      ResponseUtils.success(res, profileData, 'Profile retrieved successfully');
    } catch (error) {
      console.error('Get profile error:', error);
      ResponseUtils.error(res, 'Failed to retrieve profile', 500);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const { firstName, lastName, phone, profilePicture } = req.body;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { firstName, lastName, phone, profilePicture },
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
}

module.exports = AuthController;