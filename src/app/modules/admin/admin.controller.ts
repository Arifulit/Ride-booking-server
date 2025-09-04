

import { Request, Response } from "express";
import User, { IUser } from "../user/user.model";
import Driver from "../driver/driver.model";
import { IDriver } from "../driver/driver.model";
import Ride, { IRide } from "../ride/ride.model";
import ResponseUtils from "../../utils/response";

// Interface definitions for request parameters and query
interface GetAllUsersQuery {
  page?: string;
  limit?: string;
  role?: "admin" | "rider" | "driver";
  search?: string;
}

interface GetAllDriversQuery {
  page?: string;
  limit?: string;
  status?: "pending" | "approved" | "rejected" | "suspended";
  search?: string;
}

interface GetAllRidesQuery {
  page?: string;
  limit?: string;
  status?: string;
  riderId?: string;
  driverId?: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

interface StatsQuery {
  period?: "today" | "week" | "month";
}

interface BlockUserBody {
  reason?: string;
}

interface ApprovalBody {
  notes?: string;
}

interface RejectSuspendBody {
  reason?: string;
}

interface AdminRegisterBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}

interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalUsers?: number;
  totalDrivers?: number;
  totalRides?: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface SystemOverview {
  totalUsers: number;
  totalRiders: number;
  totalDrivers: number;
  totalRides: number;
  activeRides: number;
  onlineDrivers: number;
  pendingDriverApprovals: number;
}

interface EarningsData {
  totalRevenue: number;
  totalRides: number;
  averageFare: number;
  totalDistance: number;
}

class AdminController {
  /**
   * Get all users with pagination
   */
  static async getAllUsers(req: Request<{}, {}, {}, GetAllUsersQuery>, res: Response): Promise<Response | void> {
    try {
      const { page = "1", limit = "10", role, search } = req.query;
      
      let query: any = {};
      if (role && ["admin", "rider", "driver"].includes(role)) {
        query.role = role;
      }
      
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ];
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const users: IUser[] = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum);

      const total: number = await User.countDocuments(query);

      const paginationMeta: PaginationMeta = {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalUsers: total,
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      };

      return ResponseUtils.paginated(res, users, paginationMeta, "Users retrieved successfully");

    } catch (error) {
      console.error("Get all users error:", error);
      return ResponseUtils.error(res, "Failed to retrieve users", 500);
    }
  }

  /**
   * Block a user
   */
  static async blockUser(req: Request<{ userId: string }, {}, BlockUserBody>, res: Response): Promise<Response | void> {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const user: IUser | null = await User.findByIdAndUpdate(
        userId,
        { isBlocked: true },
        { new: true }
      ).select("-password");

      if (!user) {
        return ResponseUtils.error(res, "User not found", 404);
      }

      return ResponseUtils.success(res, { user }, "User blocked successfully");

    } catch (error) {
      console.error("Block user error:", error);
      return ResponseUtils.error(res, "Failed to block user", 500);
    }
  }

  /**
   * Unblock a user
   */
  static async unblockUser(req: Request<{ userId: string }>, res: Response): Promise<Response | void> {
    try {
      const { userId } = req.params;

      const user: IUser | null = await User.findByIdAndUpdate(
        userId,
        { isBlocked: false },
        { new: true }
      ).select("-password");

      if (!user) {
        return ResponseUtils.error(res, "User not found", 404);
      }

      return ResponseUtils.success(res, { user }, "User unblocked successfully");

    } catch (error) {
      console.error("Unblock user error:", error);
      return ResponseUtils.error(res, "Failed to unblock user", 500);
    }
  }

  /**
   * Get all drivers with pagination
   */
  static async getAllDrivers(req: Request<{}, {}, {}, GetAllDriversQuery>, res: Response): Promise<Response | void> {
    try {
      const { page = "1", limit = "10", status, search } = req.query;
      
      let query: any = {};
      if (status && ["pending", "approved", "rejected", "suspended"].includes(status)) {
        query.approvalStatus = status;
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const drivers: IDriver[] = await Driver.find(query)
        .populate("userId", "firstName lastName email phone isBlocked")
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum);

      // Apply search filter after population if needed
      let filteredDrivers = drivers;
      if (search) {
        filteredDrivers = drivers.filter((driver: any) => 
          driver.userId.firstName.toLowerCase().includes(search.toLowerCase()) ||
          driver.userId.lastName.toLowerCase().includes(search.toLowerCase()) ||
          driver.userId.email.toLowerCase().includes(search.toLowerCase()) ||
          driver.licenseNumber.toLowerCase().includes(search.toLowerCase())
        );
      }

      const total: number = await Driver.countDocuments(query);

      const paginationMeta: PaginationMeta = {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalDrivers: total,
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      };

      return ResponseUtils.paginated(res, filteredDrivers, paginationMeta, "Drivers retrieved successfully");

    } catch (error) {
      console.error("Get all drivers error:", error);
      return ResponseUtils.error(res, "Failed to retrieve drivers", 500);
    }
  }

  /**
   * Get pending driver applications
   */
  static async getPendingDrivers(req: Request<{}, {}, {}, PaginationQuery>, res: Response): Promise<Response | void> {
    try {
      const { page = "1", limit = "10" } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const drivers: IDriver[] = await Driver.find({ approvalStatus: "pending" })
        .populate("userId", "firstName lastName email phone")
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum);

      const total: number = await Driver.countDocuments({ approvalStatus: "pending" });

      const paginationMeta: PaginationMeta = {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalDrivers: total,
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      };

      return ResponseUtils.paginated(res, drivers, paginationMeta, "Pending drivers retrieved successfully");

    } catch (error) {
      console.error("Get pending drivers error:", error);
      return ResponseUtils.error(res, "Failed to retrieve pending drivers", 500);
    }
  }

  /**
   * Approve a driver
   */
  static async approveDriver(req: Request<{ driverId: string }, {}, ApprovalBody>, res: Response): Promise<Response | void> {
    try {
      const { driverId } = req.params;
      const { notes } = req.body;

      const driver: IDriver | null = await Driver.findByIdAndUpdate(
        driverId,
        { 
          approvalStatus: "approved",
          approvalNotes: notes || "Approved by admin"
        },
        { new: true }
      ).populate("userId", "firstName lastName email phone");

      if (!driver) {
        return ResponseUtils.error(res, "Driver not found", 404);
      }

      return ResponseUtils.success(res, { driver }, "Driver approved successfully");

    } catch (error) {
      console.error("Approve driver error:", error);
      return ResponseUtils.error(res, "Failed to approve driver", 500);
    }
  }

  /**
   * Reject a driver
   */
  static async rejectDriver(req: Request<{ driverId: string }, {}, RejectSuspendBody>, res: Response): Promise<Response | void> {
    try {
      const { driverId } = req.params;
      const { reason } = req.body;

      const driver: IDriver | null = await Driver.findByIdAndUpdate(
        driverId,
        { 
          approvalStatus: "rejected",
          approvalNotes: reason || "Rejected by admin"
        },
        { new: true }
      ).populate("userId", "firstName lastName email phone");

      if (!driver) {
        return ResponseUtils.error(res, "Driver not found", 404);
      }

      return ResponseUtils.success(res, { driver }, "Driver application rejected");

    } catch (error) {
      console.error("Reject driver error:", error);
      return ResponseUtils.error(res, "Failed to reject driver", 500);
    }
  }

  /**
   * Suspend a driver
   */
  static async suspendDriver(req: Request<{ driverId: string }, {}, RejectSuspendBody>, res: Response): Promise<Response | void> {
    try {
      const { driverId } = req.params;
      const { reason } = req.body;

      const driver: IDriver | null = await Driver.findByIdAndUpdate(
        driverId,
        { 
          approvalStatus: "suspended",
          isOnline: false,
          approvalNotes: reason || "Suspended by admin"
        },
        { new: true }
      ).populate("userId", "firstName lastName email phone");

      if (!driver) {
        return ResponseUtils.error(res, "Driver not found", 404);
      }

      return ResponseUtils.success(res, { driver }, "Driver suspended successfully");

    } catch (error) {
      console.error("Suspend driver error:", error);
      return ResponseUtils.error(res, "Failed to suspend driver", 500);
    }
  }

  /**
   * Get all rides with pagination
   */
  static async getAllRides(req: Request<{}, {}, {}, GetAllRidesQuery>, res: Response): Promise<Response | void> {
    try {
      const { page = "1", limit = "10", status, riderId, driverId } = req.query;
      
      let query: any = {};
      if (status) query.status = status;
      if (riderId) query.riderId = riderId;
      if (driverId) query.driverId = driverId;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const rides: IRide[] = await Ride.find(query)
        .populate("riderId", "firstName lastName email phone")
        .populate("driver", "firstName lastName email phone")
        .populate("driverProfile", "vehicleInfo rating")
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum);

      const total: number = await Ride.countDocuments(query);

      const paginationMeta: PaginationMeta = {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRides: total,
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      };

      return ResponseUtils.paginated(res, rides, paginationMeta, "Rides retrieved successfully");

    } catch (error) {
      console.error("Get all rides error:", error);
      return ResponseUtils.error(res, "Failed to retrieve rides", 500);
    }
  }

  /**
   * Get ride statistics
   */
  static async getRideStats(req: Request<{}, {}, {}, StatsQuery>, res: Response): Promise<Response | void> {
    try {
      const { period = "month" } = req.query;

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      if (period === "today") {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (period === "week") {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (period === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const stats = await Ride.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalFare: { $sum: "$fare.actual" }
          }
        }
      ]);

      const totalRides: number = await Ride.countDocuments({ createdAt: { $gte: startDate } });
      const totalRevenue = await Ride.aggregate([
        { $match: { status: "completed", createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: "$fare.actual" } } }
      ]);

      return ResponseUtils.success(res, {
        period,
        totalRides,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusBreakdown: stats
      }, "Ride statistics retrieved successfully");

    } catch (error) {
      console.error("Get ride stats error:", error);
      return ResponseUtils.error(res, "Failed to retrieve ride statistics", 500);
    }
  }

  /**
   * Get system overview
   */
  static async getSystemOverview(req: Request, res: Response): Promise<Response | void> {
    try {
      // Get counts
      const totalUsers: number = await User.countDocuments();
      const totalRiders: number = await User.countDocuments({ role: "rider" });
      const totalDrivers: number = await Driver.countDocuments();
      const totalRides: number = await Ride.countDocuments();
      const activeRides: number = await Ride.countDocuments({ 
        status: { $in: ["requested", "accepted", "picked_up", "in_transit"] } 
      });
      const onlineDrivers: number = await Driver.countDocuments({ 
        isOnline: true,
        approvalStatus: "approved"
      });

      // Get pending items
      const pendingDriverApprovals: number = await Driver.countDocuments({ approvalStatus: "pending" });

      // Recent activity
      const recentRides: IRide[] = await Ride.find()
        .populate("riderId", "firstName lastName")
        .populate("driver", "firstName lastName")
        .sort({ createdAt: -1 })
        .limit(5);

      const overview: SystemOverview = {
        totalUsers,
        totalRiders,
        totalDrivers,
        totalRides,
        activeRides,
        onlineDrivers,
        pendingDriverApprovals
      };

      return ResponseUtils.success(res, {
        overview,
        recentActivity: recentRides
      }, "System overview retrieved successfully");

    } catch (error) {
      console.error("Get system overview error:", error);
      return ResponseUtils.error(res, "Failed to retrieve system overview", 500);
    }
  }

  /**
   * Get earnings report
   */
  static async getEarningsReport(req: Request<{}, {}, {}, StatsQuery>, res: Response): Promise<Response | void> {
    try {
      const { period = "month" } = req.query;

      const now = new Date();
      let startDate: Date;
      
      if (period === "today") {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (period === "week") {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (period === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const earningsData = await Ride.aggregate([
        { 
          $match: { 
            status: "completed",
            createdAt: { $gte: startDate }
          } 
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$fare.actual" },
            totalRides: { $sum: 1 },
            averageFare: { $avg: "$fare.actual" },
            totalDistance: { $sum: "$distance.actual" }
          }
        }
      ]);

      const result: EarningsData = earningsData[0] || {
        totalRevenue: 0,
        totalRides: 0,
        averageFare: 0,
        totalDistance: 0
      };

      return ResponseUtils.success(res, {
        period,
        ...result
      }, "Earnings report retrieved successfully");

    } catch (error) {
      console.error("Get earnings report error:", error);
      return ResponseUtils.error(res, "Failed to retrieve earnings report", 500);
    }
  }

  /**
   * Admin Registration
   */
  static async adminRegister(req: Request<{}, {}, AdminRegisterBody>, res: Response): Promise<Response | void> {
    try {
      const { firstName, lastName, email, password, phone } = req.body;
      
      // Check if email already exists
      const existing: IUser | null = await User.findOne({ email });
      if (existing) {
        return ResponseUtils.error(res, "Email already registered", 409);
      }
      
      // Create admin user
      const admin = new User({
        firstName,
        lastName,
        email,
        password,
        phone,
        role: "admin"
      });
      
      await admin.save();
      const publicProfile = admin.getPublicProfile();
      
      return ResponseUtils.success(res, publicProfile, "Admin registered successfully", 201);
      
    } catch (error) {
      console.error("Admin registration error:", error);
      return ResponseUtils.error(res, "Failed to register admin", 500);
    }
  }
}

export default AdminController;