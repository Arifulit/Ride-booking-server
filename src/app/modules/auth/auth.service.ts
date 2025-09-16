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

/**
 * Generate authentication tokens
 */
const generateTokens = (user: User): TokenPair => {
  return JWTUtils.generateTokenPair({
    _id: user._id ?? user.id,
    email: user.email,
    role: user.role,
  });
};

const AuthService = {
  generateTokens,
};

export default AuthService;