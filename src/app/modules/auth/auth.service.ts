import JWTUtils from "../../utils/jwt";

interface User {
  id: string | number;
  email?: string;
  username?: string;
  [key: string]: any;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

interface DecodedToken {
  userId: string | number;
  email?: string;
  username?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

class AuthService {
  /**
   * Generate authentication tokens
   * @param user - User object
   * @returns Token information
   */
  static generateTokens(user: User): TokenPair {
    return JWTUtils.generateTokenPair(user);
  }

  /**
   * Verify authentication token
   * @param token - JWT token
   * @returns Decoded token payload
   */
  static verifyToken(token: string): DecodedToken {
    const payload = JWTUtils.verifyToken(token);
    // Ensure userId is present, fallback to id if needed
    return {
      userId: payload.userId ?? payload.id,
      email: payload.email,
      username: payload.username,
      iat: payload.iat,
      exp: payload.exp,
      ...payload
    };
  }
}

export default AuthService;