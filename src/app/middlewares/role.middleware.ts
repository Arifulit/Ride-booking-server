import { Request, Response, NextFunction } from "express";
import ResponseUtils from "../utils/response";
import Driver from "../modules/driver/driver.model";

// Custom request interface for user and driver
interface AuthRequest extends Request {
  user?: any;
  driver?: any;
}

/**
 * Role-based authorization middleware
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return ResponseUtils.error(res, "Authentication required", 401);
      }

      if (!allowedRoles.includes(req.user.role)) {
        return ResponseUtils.error(res, "Insufficient permissions", 403);
      }
      next();
    } catch (error) {
      console.error("Authorization middleware error:", error);
      return ResponseUtils.error(res, "Authorization failed", 500);
    }
  };
};

/**
 * Driver approval and online check middleware
 */
export const requireApprovedDriver = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== "driver") {
      return ResponseUtils.error(res, "Driver access required", 403);
    }

    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return ResponseUtils.error(res, "Driver profile not found", 404);
    }

    if (driver.approvalStatus !== "approved") {
      return ResponseUtils.error(res, "Driver not approved yet", 403);
    }

    req.driver = driver;
    next();
  } catch (error) {
    console.error("Driver authorization error:", error);
    return ResponseUtils.error(res, "Driver authorization failed", 500);
  }
};
