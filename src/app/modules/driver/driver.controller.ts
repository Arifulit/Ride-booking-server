
import { Request, Response } from "express";
import Driver from "./driver.model";
import { IDriver } from "./driver.interface";
import Ride from "../ride/ride.model";
import ResponseUtils from "../../utils/response";
import { catchAsync } from "../../utils/catchAsync";
import User from "../user/user.model";
import type { IUser } from "../user/user.interface";

/**
 * Get driver profile
 */
const getProfile = catchAsync(async (req: Request, res: Response) => {
  try {
    const driver = await Driver.findOne({
      userId: (req as any).user._id,
    }).populate("userId", "-password");

    if (!driver) {
      ResponseUtils.error(res, "Driver profile not found 1", 404);
      return;
    }

    ResponseUtils.success(
      res,
      { driver },
      "Driver profile retrieved successfully"
    );
  } catch (error) {
    console.error("Get driver profile error:", error);
    ResponseUtils.error(res, "Failed to retrieve driver profile", 500);
  }
});

/**
 * Update driver profile
 */
const updateProfile = catchAsync(async (req: Request, res: Response) => {
  try {
    const allowedUpdates = ["vehicleInfo", "documentsUploaded"];
    const updates: Partial<IDriver> = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        (updates as any)[key] = req.body[key];
      }
    });

    const driver = await Driver.findOneAndUpdate(
      { userId: (req as any).user._id },
      updates,
      { new: true, runValidators: true }
    ).populate("userId", "-password");

    if (!driver) {
      ResponseUtils.error(res, "Driver profile not found 2", 404);
      return;
    }

    ResponseUtils.success(
      res,
      { driver },
      "Driver profile updated successfully"
    );
  } catch (error: any) {
    console.error("Update driver profile error:", error);
    ResponseUtils.error(
      res,
      error.message || "Failed to update driver profile",
      500
    );
  }
});

/**
 * Update driver availability (online/offline)
 */
const updateAvailability = catchAsync(async (req: Request, res: Response) => {
  try {
    const { isOnline } = req.body;

    const driver = await Driver.findOneAndUpdate(
      { userId: (req as any).user._id },
      { isOnline: Boolean(isOnline) },
      { new: true }
    );

    if (!driver) {
      ResponseUtils.error(res, "Driver profile not found 3", 404);
      return;
    }

    ResponseUtils.success(
      res,
      { isOnline: driver.isOnline },
      `Driver is now ${driver.isOnline ? "online" : "offline"}`
    );
  } catch (error) {
    console.error("Update availability error:", error);
    ResponseUtils.error(res, "Failed to update availability", 500);
  }
});

/**
 * Update driver current location
 */
const updateLocation = catchAsync(async (req: Request, res: Response) => {
  try {
    const { longitude, latitude } = req.body;

    if (longitude === undefined || latitude === undefined) {
      ResponseUtils.error(res, "Longitude and latitude are required", 400);
      return;
    }

    const driver = await Driver.findOne({ userId: (req as any).user._id });
    if (!driver) {
      ResponseUtils.error(res, "Driver profile not found 4", 404);
      return;
    }

    await driver.updateLocation(longitude, latitude);

    ResponseUtils.success(
      res,
      { location: driver.currentLocation },
      "Location updated successfully"
    );
  } catch (error) {
    console.error("Update location error:", error);
    ResponseUtils.error(res, "Failed to update location", 500);
  }
});

/**
 * Get pending ride requests
 */
const getPendingRides = catchAsync(async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query as {
      page?: string;
      limit?: string;
    };

    const rides = await Ride.find({
      status: "requested",
      driverId: null,
    })
      .populate("riderId", "firstName lastName phone")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Ride.countDocuments({
      status: "requested",
      driverId: null,
    });

    ResponseUtils.paginated(
      res,
      rides,
      {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalRides: total,
        hasNext: Number(page) * Number(limit) < total,
        hasPrev: Number(page) > 1,
      },
      "Pending rides retrieved successfully"
    );
  } catch (error) {
    console.error("Get pending rides error:", error);
    ResponseUtils.error(res, "Failed to retrieve pending rides", 500);
  }
});

/**
 * Get driver's active ride
 */
const getActiveRide = catchAsync(async (req: Request, res: Response) => {
  try {
    const activeRide = await Ride.findOne({
      driverId: (req as any).user._id,
      status: { $in: ["accepted", "picked_up", "in_transit"] },
    }).populate("riderId", "firstName lastName phone");

    ResponseUtils.success(
      res,
      { ride: activeRide },
      "Active ride retrieved successfully"
    );
  } catch (error) {
    console.error("Get active ride error:", error);
    ResponseUtils.error(res, "Failed to retrieve active ride", 500);
  }
});

/**
 * Get driver's ride history
 */
const getRideHistory = catchAsync(async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
    } = req.query as {
      page?: string;
      limit?: string;
      status?: string;
    };

    const query: any = { driverId: (req as any).user._id };
    if (status) query.status = status;

    const rides = await Ride.find(query)
      .populate("riderId", "firstName lastName phone")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Ride.countDocuments(query);

    ResponseUtils.paginated(
      res,
      rides,
      {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalRides: total,
        hasNext: Number(page) * Number(limit) < total,
        hasPrev: Number(page) > 1,
      },
      "Ride history retrieved successfully"
    );
  } catch (error) {
    console.error("Get ride history error:", error);
    ResponseUtils.error(res, "Failed to retrieve ride history", 500);
  }
});

/**
 * Get driver earnings summary
 */
const getEarnings = catchAsync(async (req: Request, res: Response) => {
  try {
    const driver = await Driver.findOne({ userId: (req as any).user._id });
    if (!driver) {
      ResponseUtils.error(res, "Driver profile not found 5", 404);
      return;
    }

    const completedRides = await Ride.countDocuments({
      driverId: (req as any).user._id,
      status: "completed",
    });

    ResponseUtils.success(
      res,
      {
        earnings: driver.earnings,
        completedRides,
        rating: driver.rating,
      },
      "Earnings retrieved successfully"
    );
  } catch (error) {
    console.error("Get earnings error:", error);
    ResponseUtils.error(res, "Failed to retrieve earnings", 500);
  }
});

/**
 * Get detailed earnings breakdown
 */
const getDetailedEarnings = catchAsync(async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    const matchConditions: any = {
      driverId: (req as any).user._id,
      status: "completed",
    };

    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }

    const earnings = await Ride.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$fare.actual" },
          totalRides: { $sum: 1 },
          averageFare: { $avg: "$fare.actual" },
        },
      },
    ]);

    const result = earnings[0] || {
      totalEarnings: 0,
      totalRides: 0,
      averageFare: 0,
    };

    ResponseUtils.success(
      res,
      result,
      "Detailed earnings retrieved successfully"
    );
  } catch (error) {
    console.error("Get detailed earnings error:", error);
    ResponseUtils.error(res, "Failed to retrieve detailed earnings", 500);
  }
});

const getRidersList = catchAsync(async (req: Request, res: Response) => {
  const { page = "1", limit = "20", q } = req.query as Record<string, string | undefined>;
  const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
  const limitNum = Math.max(parseInt(String(limit), 10) || 20, 1);
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, any> = { role: "rider", isBlocked: { $ne: true } };

  if (q) {
    const regex = new RegExp(String(q), "i");
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phone: regex },
    ];
  }

  const [total, items] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select("-password -auths")
       .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limitNum));
  const meta = {
    currentPage: pageNum,
    totalPages,
    totalRiders: total,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1,
  };

  if (ResponseUtils.paginated) {
    ResponseUtils.paginated(res, items, meta, "Riders fetched");
    return;
  }

  res.status(200).json({
    success: true,
    message: "Riders fetched",
    data: { items, ...meta },
     errors: null,
    timestamp: new Date().toISOString(),
  });
});






export const DriverController = {
  getProfile,
  updateProfile,
  updateAvailability,
  updateLocation,
  getPendingRides,
  getActiveRide,
  getRideHistory,
  getEarnings,
  getDetailedEarnings,
  getRidersList,
 
};
