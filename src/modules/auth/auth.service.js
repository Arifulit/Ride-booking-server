const JWTUtils = require('../../utils/jwt');

class AuthService {
  /**
   * Generate authentication tokens
   * @param {Object} user - User object
   * @returns {Object} - Token information
   */
  static generateTokens(user) {
    return JWTUtils.generateTokenPair(user);
  }

  /**
   * Verify authentication token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded token payload
   */
  static verifyToken(token) {
    return JWTUtils.verifyToken(token);
  }
}

module.exports = AuthService;