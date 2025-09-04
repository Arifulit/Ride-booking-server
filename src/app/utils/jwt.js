const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

class JWTUtils {
  /**
   * Generate JWT token
   * @param {Object} payload - Token payload
   * @returns {string} - JWT token
   */
  static generateToken(payload) {
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded payload
   */
  static verifyToken(token) {
    return jwt.verify(token, jwtConfig.secret);
  }

  /**
   * Generate access and refresh tokens
   * @param {Object} user - User object
   * @returns {Object} - Token pair
   */
  static generateTokenPair(user) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role
    };

    const accessToken = this.generateToken(payload);
    
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: jwtConfig.expiresIn
    };
  }
}

module.exports = JWTUtils;