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
  expiresIn: number; // seconds
}

class JWTUtils {
  // Access token generate
  static generateToken(payload: Record<string, any>, expiresIn?: string | number): string {
    const secret = process.env.JWT_ACCESS_SECRET || "your_access_secret";
    
    // JWT এর জন্য expiresIn string বা number হতে পারে
    const options: SignOptions = {};
    if (expiresIn) {
      options.expiresIn = expiresIn as SignOptions['expiresIn'];
    } else if (process.env.JWT_ACCESS_EXPIRES_IN) {
      // If JWT_ACCESS_EXPIRES_IN is a number string, convert to number, else use as string (e.g., "1h")
      const envExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN;
      options.expiresIn = !envExpiresIn
        ? undefined
        : isNaN(Number(envExpiresIn))
        ? envExpiresIn as SignOptions['expiresIn']
        : Number(envExpiresIn) as SignOptions['expiresIn'];
    } else {
      options.expiresIn = "1h";
    }

    return jwt.sign(payload, secret, options);
  }

  // Token verify
  static verifyToken(token: string): Record<string, any> {
    const secret = process.env.JWT_ACCESS_SECRET || "your_access_secret";
    return jwt.verify(token, secret) as Record<string, any>;
  }

  // Access + Refresh token generate
  static generateTokenPair(user: IUserPayload): ITokenPair {
    const id = user._id ?? user.id;
    const payload = { id, email: user.email, role: user.role };

    // Access token
    const accessToken = this.generateToken(payload, process.env.JWT_ACCESS_EXPIRES_IN || "1h");

    // Refresh token
    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || "your_refresh_secret",
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" } as SignOptions
    );

    // Access token expiresIn in seconds
    const expiresInStr = process.env.JWT_ACCESS_EXPIRES_IN || "3600";
    let expiresIn = parseInt(expiresInStr, 10);
    if (isNaN(expiresIn)) expiresIn = 3600;

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn,
    };
  }
}

export default JWTUtils;
