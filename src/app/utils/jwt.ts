// import crypto from "crypto";
// // import jwt from "jsonwebtoken";

// const secret = crypto.randomBytes(32).toString("hex");
// console.log("jwt secret:", secret);

import jwt, { SignOptions } from "jsonwebtoken";

interface IUserPayload {
  _id?: string | number;
  id?: string | number;
  email?: string;
  role?: string;
}

interface ITokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number; // in seconds
}

class JWTUtils {
  static verifyToken(token: string) {
    throw new Error("Method not implemented.");
  }
  /**
   * Generic function to generate a JWT token
   */
  static generateToken(
    payload: Record<string, any>,
    secret: string,
    expiresIn?: string | number
  ): string {
    const options: SignOptions = {};
  if (expiresIn) options.expiresIn = expiresIn as any;
    return jwt.sign(payload, secret, options);
  }

  /**
   * Verify Access Token
   */
  static verifyAccessToken(token: string): Record<string, any> {
    const secret = process.env.JWT_ACCESS_SECRET as string;
    if (!secret) throw new Error("JWT_ACCESS_SECRET is not defined in .env");
    return jwt.verify(token, secret) as Record<string, any>;
  }

  /**
   * Verify Refresh Token
   */
  static verifyRefreshToken(token: string): Record<string, any> {
    const secret = process.env.JWT_REFRESH_SECRET as string;
    if (!secret) throw new Error("JWT_REFRESH_SECRET is not defined in .env");
    return jwt.verify(token, secret) as Record<string, any>;
  }

  /**
   * Generate Access + Refresh Token Pair
   */
  static generateTokenPair(user: IUserPayload): ITokenPair {
    const id = user._id ?? user.id;
    const payload = { id, email: user.email, role: user.role };

    const accessSecret = process.env.JWT_ACCESS_SECRET as string;
    const refreshSecret = process.env.JWT_REFRESH_SECRET as string;

    if (!accessSecret || !refreshSecret) {
      throw new Error("JWT secrets are not defined in .env");
    }

    // Generate Access Token
    const accessToken = this.generateToken(
      payload,
      accessSecret,
      process.env.JWT_ACCESS_EXPIRES_IN || "1d"
    );

    // Generate Refresh Token
    const refreshToken = this.generateToken(
      payload,
      refreshSecret,
      process.env.JWT_REFRESH_EXPIRES_IN || "30d"
    );

    // Calculate expiresIn in seconds
    let expiresIn = 86400; // default 1 day
    const accessExpiry = process.env.JWT_ACCESS_EXPIRES_IN || "1d";

    if (/^\d+$/.test(accessExpiry)) {
      expiresIn = parseInt(accessExpiry, 10);
    } else if (accessExpiry.endsWith("d")) {
      expiresIn = parseInt(accessExpiry, 10) * 86400;
    } else if (accessExpiry.endsWith("h")) {
      expiresIn = parseInt(accessExpiry, 10) * 3600;
    } else if (accessExpiry.endsWith("m")) {
      expiresIn = parseInt(accessExpiry, 10) * 60;
    }

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn,
    };
  }
}

export default JWTUtils;
