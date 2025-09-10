
// import { DecodedTokenPayload } from "./types";
import JWTUtils from "../../utils/jwt";

interface User {
  id?: string | number;
  _id?: string | number;
  email?: string;
  role?: string;
  [key: string]: any;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: string;
}

interface DecodedToken {
  userId?: string | number;
  id?: string | number;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

class AuthService {
  /**
   * Generate authentication tokens
   */
  static generateTokens(user: User): TokenPair {
    return JWTUtils.generateTokenPair({
      _id: user._id ?? user.id,
      email: user.email,
      role: user.role,
    });
  }

  /**
   * Verify authentication token
   */
}

export interface DecodedTokenPayload {
  userId?: string | number;
  id?: string | number;
  _id?: string | number;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export default AuthService;