
import { Request, Response, NextFunction } from "express";
import JWTUtils from "../utils/jwt";
import User from "../modules/user/user.model";
import ResponseUtils from "../utils/response";

/**
 * Authenticate user using JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Accept token from Authorization header, x-access-token, cookie or query
    let token =
      (req.headers.authorization as string) ||
      (req.headers["x-access-token"] as string) ||
      (req as any).cookies?.token ||
      (req as any).cookies?.accessToken ||
      (req.query?.token as string);

    if (token) {
      token = String(token).trim();
      // strip common prefixes
      if (/^bearer\s+/i.test(token)) token = token.replace(/^bearer\s+/i, "").trim();
      if (/^token\s+/i.test(token)) token = token.replace(/^token\s+/i, "").trim();
    }

    if (!token) {
      return ResponseUtils.error(res, "Access token required", 401);
    }

    let decoded: Record<string, any>;
    try {
      decoded = JWTUtils.verifyAccessToken(token) as Record<string, any>;
    } catch (jwtError: any) {
      // Support both name-based and message-based errors from jwt utils
      const name = jwtError?.name;
      const msg = jwtError?.message;
      if (name === "TokenExpiredError" || msg === "TokenExpired") {
        return ResponseUtils.error(res, "Token has expired", 401);
      }
      if (name === "JsonWebTokenError" || msg === "InvalidToken") {
        return ResponseUtils.error(res, "Invalid token", 401);
      }
      return ResponseUtils.error(res, "Token verification failed", 401);
    }

    const userId = decoded?.id ?? decoded?._id ?? decoded?.userId;
    if (!userId) {
      return ResponseUtils.error(res, "Invalid token payload", 401);
    }

    const user = await User.findById(userId).select("-password").lean();
    if (!user) {
      return ResponseUtils.error(res, "User not found", 401);
    }

    if ((user as any).isBlocked) {
      return ResponseUtils.error(res, "Account has been blocked", 403);
    }

    // attach user (keep full mongoose doc when possible)
    (req as any).user = user;
    return next();
  } catch (error: any) {
    console.error("Authentication middleware error:", error?.message || error);
    return ResponseUtils.error(res, "Authentication failed", 500);
  }
};