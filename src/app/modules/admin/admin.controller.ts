/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Request, Response } from "express";
import User from "../user/user.model";
import { IUser } from "../user/user.interface";
import Driver from "../driver/driver.model";
import { IDriver } from "../driver/driver.interface";
import Ride from "../ride/ride.model";
import { IRide } from "../ride/ride.interface";
import ResponseUtils from "../../utils/response";
import type { ParsedQs } from "qs";

import {
  AdminRegisterBody,
  BlockUserBody,
  ApprovalBody,
  RejectSuspendBody,
  StatsQuery,
} from "./admin.interface";
import { catchAsync } from "../../utils/catchAsync";


/** Get all users with pagination */
function getRoleString(
  role: string | ParsedQs | (string | ParsedQs)[] | undefined
): string | undefined {
  if (typeof role === "string") {
    return role.toLowerCase();
  }
  if (Array.isArray(role) && typeof role[0] === "string") {
    return role[0].toLowerCase();
  }
  return undefined;
}

const getAllUsers = catchAsync(
  async (req: Request<{}, {}, {}, any>, res: Response) => {
    const {
      page: pageRaw = "1",
      limit: limitRaw = "10",
      role,
      search,
    } = req.query;

    const page =
      typeof pageRaw === "string"
        ? pageRaw
        : Array.isArray(pageRaw) && typeof pageRaw[0] === "string"
        ? pageRaw[0]
        : "1";
    const limit =
      typeof limitRaw === "string"
        ? limitRaw
        : Array.isArray(limitRaw) && typeof limitRaw[0] === "string"
        ? limitRaw[0]
        : "10";

    const query: any = {};
    const roleStr = getRoleString(role);
    if (roleStr && ["admin", "rider", "driver"].includes(roleStr))
      query.role = roleStr;

    let searchStr: string | undefined;
    if (typeof search === "string") {
      searchStr = search;
    } else if (Array.isArray(search) && typeof search[0] === "string") {
      searchStr = search[0];
    }
    if (searchStr)
      query.$or = [
        { firstName: { $regex: searchStr, $options: "i" } },
        { lastName: { $regex: searchStr, $options: "i" } },
        { email: { $regex: searchStr, $options: "i" } },
      ];

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const users: IUser[] = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total: number = await User.countDocuments(query);

    ResponseUtils.paginated(
      res,
      users,
      {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalUsers: total,
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
      "Users retrieved successfully"
    );
  }
);

/** Block user */
const blockUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;

  const user: IUser | null = await User.findByIdAndUpdate(
    userId,
    { isBlocked: true },
    { new: true }
  ).select("-password");

  if (!user) {
    ResponseUtils.error(res, "User not found", 404);
    return;
  }
  ResponseUtils.success(res, { user }, "User blocked successfully");
});

/** Unblock user */
const unblockUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;

  const user: IUser | null = await User.findByIdAndUpdate(
    userId,
    { isBlocked: false },
    { new: true }
  ).select("-password");

  if (!user) {
    ResponseUtils.error(res, "User not found", 404);
    return;
  }
  ResponseUtils.success(res, { user }, "User unblocked successfully");
});

/** Get all drivers with pagination */

function getStringParam(param: unknown, defaultValue: string = ""): string {
  if (typeof param === "string") return param;
  if (Array.isArray(param) && typeof param[0] === "string") return param[0];
  return defaultValue;
}

// Get all drivers
const getAllDrivers = catchAsync(async (req: Request, res: Response) => {
  const page = getStringParam(req.query.page, "1");
  const limit = getStringParam(req.query.limit, "10");
  const status = getStringParam(req.query.status);
  const search = getStringParam(req.query.search);
  const query: any = {};
  if (
    status &&
    ["pending", "approved", "rejected", "suspended"].includes(status)
  )
    query.approvalStatus = status;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const drivers: IDriver[] = await Driver.find(query)
    .populate("userId", "firstName lastName email phone isBlocked")
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .skip((pageNum - 1) * limitNum);

  const filteredDrivers = search
    ? drivers.filter((d) => {
        const user =
          typeof d.userId === "object" &&
          d.userId !== null &&
          "firstName" in d.userId
            ? (d.userId as unknown as IUser)
            : null;
        return (
          (user &&
            (user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
              user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
              user.email?.toLowerCase().includes(search.toLowerCase()))) ||
          d.licenseNumber.toLowerCase().includes(search.toLowerCase())
        );
      })
    : drivers;

  const total: number = await Driver.countDocuments(query);

  ResponseUtils.paginated(
    res,
    filteredDrivers,
    {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalDrivers: total,
      hasNext: pageNum * limitNum < total,
      hasPrev: pageNum > 1,
    },
    "Drivers retrieved successfully"
  );
});

/** Get pending driver applications */

const getPendingDrivers = catchAsync(async (req: Request, res: Response) => {
  const page = getStringParam(req.query.page, "1");
  const limit = getStringParam(req.query.limit, "10");
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const drivers: IDriver[] = await Driver.find({ approvalStatus: "pending" })
    .populate("userId", "firstName lastName email phone")
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .skip((pageNum - 1) * limitNum);
  const total: number = await Driver.countDocuments({
    approvalStatus: "pending",
  });
  const paginationMeta = {
    currentPage: pageNum,
    totalPages: Math.ceil(total / limitNum),
    totalDrivers: total,
    hasNext: pageNum * limitNum < total,
    hasPrev: pageNum > 1,
  };
  ResponseUtils.paginated(
    res,
    drivers,
    paginationMeta,
    "Pending drivers retrieved successfully"
  );
});

/** Approve driver */
const approveDriver = catchAsync(async (req: Request, res: Response) => {
  const driverId = req.params.driverId;
  const { notes } = req.body;

  const driver: IDriver | null = await Driver.findByIdAndUpdate(
    driverId,
    { approvalStatus: "approved", approvalNotes: notes || "Approved by admin" },
    { new: true }
  ).populate("userId", "firstName lastName email phone");

  if (!driver) {
    ResponseUtils.error(res, "Driver not found", 404);
    return;
  }
  ResponseUtils.success(res, { driver }, "Driver approved successfully");
});

/** Reject driver */
const rejectDriver = catchAsync(async (req: Request, res: Response) => {
  const driverId = req.params.driverId;
  const { reason } = req.body;

  const driver: IDriver | null = await Driver.findByIdAndUpdate(
    driverId,
    {
      approvalStatus: "rejected",
      approvalNotes: reason || "Rejected by admin",
    },
    { new: true }
  ).populate("userId", "firstName lastName email phone");

  if (!driver) {
    ResponseUtils.error(res, "Driver not found", 404);
    return;
  }
  ResponseUtils.success(res, { driver }, "Driver application rejected");
});

/** Suspend driver */
const suspendDriver = catchAsync(async (req: Request, res: Response) => {
  const driverId = req.params.driverId;
  const { reason } = req.body;

  const driver: IDriver | null = await Driver.findByIdAndUpdate(
    driverId,
    {
      approvalStatus: "suspended",
      isOnline: false,
      approvalNotes: reason || "Suspended by admin",
    },
    { new: true }
  ).populate("userId", "firstName lastName email phone");

  if (!driver) {
    ResponseUtils.error(res, "Driver not found", 404);
    return;
  }
  ResponseUtils.success(res, { driver }, "Driver suspended successfully");
});

/** Get all rides with pagination */

const getAllRides = catchAsync(
  async (req: Request<{}, {}, {}, any>, res: Response) => {
    const page = getStringParam(req.query.page, "1");
    const limit = getStringParam(req.query.limit, "10");
    const status = getStringParam(req.query.status);
    const riderId = getStringParam(req.query.riderId);
    const driverId = getStringParam(req.query.driverId);
    const query: any = {};
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

    ResponseUtils.paginated(
      res,
      rides,
      {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRides: total,
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
      "Rides retrieved successfully"
    );
  }
);

/** Ride statistics */

const getRideStats = catchAsync(
  async (req: Request<{}, {}, {}, StatsQuery>, res: Response) => {
    const period = getStringParam(req.query.period, "month");
    const now = new Date();
    let startDate: Date;

    if (period === "today") startDate = new Date(now.setHours(0, 0, 0, 0));
    else if (period === "week")
      startDate = new Date(now.setDate(now.getDate() - 7));
    else startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await Ride.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalFare: { $sum: "$fare.actual" },
        },
      },
    ]);

    const totalRides: number = await Ride.countDocuments({
      createdAt: { $gte: startDate },
    });
    const totalRevenue = await Ride.aggregate([
      { $match: { status: "completed", createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: "$fare.actual" } } },
    ]);

    ResponseUtils.success(
      res,
      {
        period,
        totalRides,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusBreakdown: stats,
      },
      "Ride statistics retrieved successfully"
    );
  }
);

/** System overview */
const getSystemOverview = catchAsync(async (req: Request, res: Response) => {
  const totalUsers = await User.countDocuments();
  const totalRiders = await User.countDocuments({ role: "rider" });
  const totalDrivers = await Driver.countDocuments();
  const totalRides = await Ride.countDocuments();
  const activeRides = await Ride.countDocuments({
    status: { $in: ["requested", "accepted", "picked_up", "in_transit"] },
  });
  const onlineDrivers = await Driver.countDocuments({
    isOnline: true,
    approvalStatus: "approved",
  });
  const pendingDriverApprovals = await Driver.countDocuments({
    approvalStatus: "pending",
  });

  const recentRides = await Ride.find()
    .populate("riderId", "firstName lastName")
    .populate("driver", "firstName lastName")
    .sort({ createdAt: -1 })
    .limit(5);

  ResponseUtils.success(
    res,
    {
      overview: {
        totalUsers,
        totalRiders,
        totalDrivers,
        totalRides,
        activeRides,
        onlineDrivers,
        pendingDriverApprovals,
      },
      recentActivity: recentRides,
    },
    "System overview retrieved successfully"
  );
});

/** Earnings report */

const getEarningsReport = catchAsync(async (req: Request, res: Response) => {
  const period = getStringParam(req.query.period, "month");
  const now = new Date();
  let startDate: Date;

  if (period === "today") startDate = new Date(now.setHours(0, 0, 0, 0));
  else if (period === "week")
    startDate = new Date(now.setDate(now.getDate() - 7));
  else startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  const earningsData = await Ride.aggregate([
    { $match: { status: "completed", createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$fare.actual" },
        totalRides: { $sum: 1 },
        averageFare: { $avg: "$fare.actual" },
        totalDistance: { $sum: "$distance.actual" },
      },
    },
  ]);

  const result = earningsData[0] || {
    totalRevenue: 0,
    totalRides: 0,
    averageFare: 0,
    totalDistance: 0,
  };
  ResponseUtils.success(
    res,
    { period, ...result },
    "Earnings report retrieved successfully"
  );
});
/**
 * Get admin profile
 */
const getProfile = catchAsync(async (req: Request, res: Response) => {
  // Basic admin info
  const admin = await User.findOne({
    _id: (req as any).user._id,
    role: "admin",
  }).select("-password");

  if (!admin) {
    return ResponseUtils.error(res, "Admin profile not found", 404);
  }

  // System summary (admin's responsibilities)
  const [
    totalUsers,
    totalDrivers,
    totalRiders,
    totalRides,
    onlineDrivers,
    pendingDrivers,
    activeRides,
    completedRides,
    totalEarnings,
  ] = await Promise.all([
    User.countDocuments(),
    Driver.countDocuments(),
    User.countDocuments({ role: "rider" }),
    Ride.countDocuments(),
    Driver.countDocuments({ isOnline: true, approvalStatus: "approved" }),
    Driver.countDocuments({ approvalStatus: "pending" }),
    Ride.countDocuments({ status: { $in: ["requested", "accepted", "picked_up", "in_transit"] } }),
    Ride.countDocuments({ status: "completed" }),
    Ride.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$fare.actual" } } },
    ]),
  ]);

  // Recent activity (last 5 rides)
  const recentRides = await Ride.find()
    .populate("riderId", "firstName lastName")
    .populate("driver", "firstName lastName")
    .sort({ createdAt: -1 })
    .limit(5);

  return ResponseUtils.success(
    res,
    {
      admin,
      responsibilities: [
        "User management (block/unblock users, view users)",
        "Driver management (approve/reject/suspend drivers, view drivers)",
        "Ride management (view all rides, monitor active rides)",
        "System analytics (view stats, earnings, recent activity)",
      ],
      systemStats: {
        totalUsers,
        totalDrivers,
        totalRiders,
        totalRides,
        onlineDrivers,
        pendingDrivers,
        activeRides,
        completedRides,
        totalEarnings: totalEarnings[0]?.total || 0,
      },
      recentActivity: recentRides,
    },
    "Admin profile and dashboard summary"
  );
});

export const AdminController = {
  
  getAllUsers,
  blockUser,
  unblockUser,
  getAllDrivers,
  getPendingDrivers,
  approveDriver,
  rejectDriver,
  suspendDriver,
  getAllRides,
  getRideStats,
  getSystemOverview,
  getEarningsReport,
  getProfile,
};
