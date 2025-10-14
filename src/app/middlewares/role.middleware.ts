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
    if (!req.user) {
      ResponseUtils.error(res, "Authentication required", 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      ResponseUtils.error(res, "Insufficient permissions", 403);
      return;
    }
    next();
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
      ResponseUtils.error(res, "Driver access required", 403);
      return;
    }

    const driver = await Driver.findOne({ userId: req.user.id });
    console.log("Request: ", req.user);
    if (!driver) {
      ResponseUtils.error(res, "Driver profile not found MIDD", 404);
      return;
    }

    if (driver.approvalStatus !== "approved") {
      ResponseUtils.error(res, "Driver not approved yet", 403);
      return;
    }

    req.driver = driver;
    next();
  } catch (error) {
    console.error("Driver authorization error:", error);
    ResponseUtils.error(res, "Driver authorization failed", 500);
  }
};