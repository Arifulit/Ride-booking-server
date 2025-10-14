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
    // Accept token in multiple common forms: "Authorization: Bearer <token>", raw token in Authorization, or x-access-token header
    let token = (req.headers.authorization as string) || (req.headers["x-access-token"] as string);
    if (token && token.toLowerCase().startsWith("bearer ")) {
      token = token.slice(7).trim();
    }

    if (!token) {
      return ResponseUtils.error(res, "Access token required", 401);
    }

    try {
      // Use JWTUtils.verifyAccessToken to verify token (uses .env secret)
      const decoded = JWTUtils.verifyAccessToken(token) as {
        id?: string;
        _id?: string;
      };

      // Get user from database (decoded.id or decoded._id)
      const userId = decoded.id ?? decoded._id;
      const user = await User.findById(userId).select("-password");
      if (!user) {
        return ResponseUtils.error(res, "User not found", 401);
      }

      // Check if user is blocked
      if (user.isBlocked) {
        return ResponseUtils.error(res, "Account has been blocked", 403);
      }

      req.user = user;
      next();
    } catch (jwtError: any) {
      if (jwtError?.name === "TokenExpiredError") {
        return ResponseUtils.error(res, "Token has expired", 401);
      } else if (jwtError?.name === "JsonWebTokenError") {
        return ResponseUtils.error(res, "Invalid token", 401);
      }
      return ResponseUtils.error(res, "Token verification failed", 401);
    }
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return ResponseUtils.error(res, "Authentication failed", 500);
  }
};