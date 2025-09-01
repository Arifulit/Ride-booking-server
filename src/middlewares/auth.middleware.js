const jwt = require('jsonwebtoken');
const User = require('../modules/user/user.model');
const ResponseUtils = require('../utils/response');
const jwtConfig = require('../config/jwt');

/**
 * Authenticate user using JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtils.error(res, 'Access token required', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, jwtConfig.secret);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return ResponseUtils.error(res, 'User not found', 401);
      }

      // Check if user is blocked
      if (user.isBlocked) {
        return ResponseUtils.error(res, 'Account has been blocked', 403);
      }

      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return ResponseUtils.error(res, 'Token has expired', 401);
      } else if (jwtError.name === 'JsonWebTokenError') {
        return ResponseUtils.error(res, 'Invalid token', 401);
      }
      return ResponseUtils.error(res, 'Token verification failed', 401);
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return ResponseUtils.error(res, 'Authentication failed', 500);
  }
};

module.exports = { authenticate };