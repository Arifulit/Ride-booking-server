const bcrypt = require('bcryptjs');

class PasswordUtils {
  /**
   * Hash a password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} - Match result
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

module.exports = PasswordUtils;