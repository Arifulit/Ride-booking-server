const ResponseUtils = require('../utils/response');
const Driver = require('../modules/driver/driver.model');

/**
 * Check if user has required role
 * @param {Array} allowedRoles - Array of allowed roles
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return ResponseUtils.error(res, 'Authentication required', 401);
      }

      if (!allowedRoles.includes(req.user.role)) {
        return ResponseUtils.error(res, 'Insufficient permissions', 403);
      }
      next();
    } catch (error) {
      console.error('Authorization middleware error:', error);
      return ResponseUtils.error(res, 'Authorization failed', 500);
    }
  };
};

/**
 * Check if driver is approved and online for driver-specific actions
 */
const requireApprovedDriver = async (req, res, next) => {
  try {
    if (req.user.role !== 'driver') {
      return ResponseUtils.error(res, 'Driver access required', 403);
    }

    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return ResponseUtils.error(res, 'Driver profile not found', 404);
    }

    if (driver.approvalStatus !== 'approved') {
      return ResponseUtils.error(res, 'Driver not approved yet', 403);
    }

    req.driver = driver;
    next();
  } catch (error) {
    console.error('Driver authorization error:', error);
    return ResponseUtils.error(res, 'Driver authorization failed', 500);
  }
};

module.exports = { authorize, requireApprovedDriver };