
import { Request, Response } from "express";
import Driver, { IDriver } from "./driver.model";
import Ride, { IRide } from "../ride/ride.model";
import ResponseUtils from "../../utils/response";

// কাস্টম রিকোয়েস্ট ইন্টারফেস যাতে user property থাকে
interface AuthenticatedRequest extends Request {
  user: any;
}

class DriverController {
  /**
   * Get driver profile
   */
  // ড্রাইভার প্রোফাইল দেখুন
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const driver: IDriver | null = await Driver.findOne({ userId: req.user._id })
        .populate("userId", "-password");

      if (!driver) {
        return ResponseUtils.error(res, "Driver profile not found", 404);
      }

      ResponseUtils.success(res, { driver }, "Driver profile retrieved successfully");
    } catch (error) {
      console.error("Get driver profile error:", error);
      ResponseUtils.error(res, "Failed to retrieve driver profile", 500);
    }
  }

  /**
   * Update driver profile
   */
  // ড্রাইভার প্রোফাইল আপডেট করুন
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const allowedUpdates = ["vehicleInfo", "documentsUploaded"];
      const updates: Record<string, any> = {};

      Object.keys(req.body).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      const driver: IDriver | null = await Driver.findOneAndUpdate(
        { userId: req.user._id },
        updates,
        { new: true, runValidators: true }
      ).populate("userId", "-password");

      ResponseUtils.success(res, { driver }, "Driver profile updated successfully");
    } catch (error: any) {
      console.error("Update driver profile error:", error);
      ResponseUtils.error(res, error.message || "Failed to update driver profile", 500);
    }
  }

  /**
   * Update driver availability
   */
  // ড্রাইভার অনলাইন/অফলাইন স্ট্যাটাস আপডেট
  static async updateAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { isOnline } = req.body;

      const driver: IDriver | null = await Driver.findOneAndUpdate(
        { userId: req.user._id },
        { isOnline: Boolean(isOnline) },
        { new: true }
      );

      if (!driver) {
        return ResponseUtils.error(res, "Driver profile not found", 404);
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
  }

  /**
   * Update driver location
   */
  // ড্রাইভার লোকেশন আপডেট
  static async updateLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { longitude, latitude } = req.body;

      if (longitude === undefined || latitude === undefined) {
        return ResponseUtils.error(res, "Longitude and latitude are required", 400);
      }

      const driver: IDriver | null = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
        return ResponseUtils.error(res, "Driver profile not found", 404);
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
  }

  /**
   * Get pending ride requests for driver
   */
  // ড্রাইভারের জন্য পেন্ডিং রাইড দেখুন
  static async getPendingRides(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10 } = req.query as { page?: any; limit?: any };

      const rides: IRide[] = await Ride.find({
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
  }

  /**
   * Get driver's active ride
   */
  // ড্রাইভারের অ্যাক্টিভ রাইড দেখুন
  static async getActiveRide(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const activeRide: IRide | null = await Ride.findOne({
        driverId: req.user._id,
        status: { $in: ["accepted", "picked_up", "in_transit"] },
      }).populate("riderId", "firstName lastName phone");

      ResponseUtils.success(res, { ride: activeRide }, "Active ride retrieved successfully");
    } catch (error) {
      console.error("Get active ride error:", error);
      ResponseUtils.error(res, "Failed to retrieve active ride", 500);
    }
  }

  /**
   * Get driver's ride history
   */
  // ড্রাইভারের রাইড হিস্ট্রি দেখুন
  static async getRideHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, status } = req.query as {
        page?: any;
        limit?: any;
        status?: string;
      };

      const query: any = { driverId: req.user._id };
      if (status) query.status = status;

      const rides: IRide[] = await Ride.find(query)
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
  }

  /**
   * Get driver earnings summary
   */
  // ড্রাইভারের আর্নিংস দেখুন
  static async getEarnings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const driver: IDriver | null = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
        return ResponseUtils.error(res, "Driver profile not found", 404);
      }

      const completedRides = await Ride.countDocuments({
        driverId: req.user._id,
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
  }

  /**
   * Get detailed earnings breakdown
   */
  // ড্রাইভারের ডিটেইলড আর্নিংস দেখুন
  static async getDetailedEarnings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query as {
        startDate?: string;
        endDate?: string;
      };

      const matchConditions: any = {
        driverId: req.user._id,
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

      const result =
        earnings[0] || {
          totalEarnings: 0,
          totalRides: 0,
          averageFare: 0,
        };

      ResponseUtils.success(res, result, "Detailed earnings retrieved successfully");
    } catch (error) {
      console.error("Get detailed earnings error:", error);
      ResponseUtils.error(res, "Failed to retrieve detailed earnings", 500);
    }
  }
}

export default DriverController;
