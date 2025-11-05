/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as bcrypt from "bcryptjs";
import { Request, Response } from "express";
import User from "../user/user.model";
import { IUser } from "../user/user.interface";
import Driver from "../driver/driver.model";
import { IDriver } from "../driver/driver.interface";
import Ride from "../ride/ride.model";
import { IRide } from "../ride/ride.interface";
import ResponseUtils from "../../utils/response";
import type { ParsedQs } from "qs";
import fs from "fs/promises";
import path from "path";
import * as mongoose from "mongoose";
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
  const { notes } = req.body || {};

  if (!driverId) {
    ResponseUtils.error(res, "driverId is required", 400);
    return;
  }

  const driver: IDriver | null = await Driver.findByIdAndUpdate(
    driverId,
    {
      approvalStatus: "approved",
      approvalNotes: notes || "Approved by admin",
      approvedAt: new Date(),
    },
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
  const { reason } = req.body || {};

  if (!driverId) {
    ResponseUtils.error(res, "driverId is required", 400);
    return;
  }

  const driver: IDriver | null = await Driver.findByIdAndUpdate(
    driverId,
    {
      approvalStatus: "rejected",
      approvalNotes: reason || "Rejected by admin",
      rejectedAt: new Date(),
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
  const { reason } = req.body || {};

  if (!driverId) {
    ResponseUtils.error(res, "driverId is required", 400);
    return;
  }

  const driver: IDriver | null = await Driver.findByIdAndUpdate(
    driverId,
    {
      approvalStatus: "suspended",
      isOnline: false,
      approvalNotes: reason || "Suspended by admin",
      suspendedAt: new Date(),
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

    const rides: IRide[] = (await Ride.find(query)
      .populate("riderId", "firstName lastName email phone")
      .populate("driver", "firstName lastName email phone")
      .populate("driverProfile", "vehicleInfo rating")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean()) as unknown as IRide[];

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
  const adminId = (req as any).user?._id;

  // try to fetch by requester id first, fallback to any admin user
  let admin = null;
  if (adminId) {
    admin = await User.findOne({ _id: adminId, role: "admin" }).select(
      "-password -auths"
    );
  }
  if (!admin) {
    admin = await User.findOne({ role: "admin" }).select("-password -auths");
  }

  if (!admin) {
    return ResponseUtils.error(res, "Admin profile not found", 404);
  }

  return ResponseUtils.success(res, { admin }, "Admin profile retrieved");
});

/** Get all riders (admin only) */
const getAllRiders = catchAsync(async (req: Request, res: Response) => {
  const page = getStringParam(req.query.page, "1");
  const limit = getStringParam(req.query.limit, "10");
  const q = getStringParam(req.query.q, "");
  const isBlockedParam = getStringParam(req.query.isBlocked, "");
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);

  const query: any = { role: "rider" };
  if (isBlockedParam === "true") query.isBlocked = true;
  else if (isBlockedParam === "false") query.isBlocked = { $ne: true };

  if (q) {
    const re = new RegExp(q, "i");
    query.$or = [
      { firstName: re },
      { lastName: re },
      { email: re },
      { phone: re },
    ];
  }

  const [total, riders] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .select("-password -auths")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
  ]);

  ResponseUtils.paginated(
    res,
    riders,
    {
      currentPage: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      totalRiders: total,
      hasNext: pageNum * limitNum < total,
      hasPrev: pageNum > 1,
    },
    "Riders retrieved successfully"
  );
});

/**
 * Update admin profile (only profile fields + optional password change)
 */
const updateProfile = catchAsync(async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user?._id;
    if (!adminId) return ResponseUtils.error(res, "Unauthenticated", 401);

    const body = req.body || {};
    const allowed = ["firstName", "lastName", "email", "phone"];
    const updates: any = {};

    Object.keys(body).forEach((k) => {
      if (allowed.includes(k)) updates[k] = (body as any)[k];
    });

    // email uniqueness check
    if (updates.email) {
      const exists = await User.findOne({
        email: updates.email,
        _id: { $ne: adminId },
      });
      if (exists) return ResponseUtils.error(res, "Email already in use", 400);
    }

    // password change flow
    if (body.currentPassword && body.newPassword) {
      const admin = await User.findById(adminId).select("+password");
      if (!admin) return ResponseUtils.error(res, "Admin not found", 404);

      const match = await bcrypt.compare(
        String(body.currentPassword),
        (admin as any).password || ""
      );
      if (!match)
        return ResponseUtils.error(res, "Current password is incorrect", 400);

      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUND || "10", 10);
      (admin as any).password = await bcrypt.hash(
        String(body.newPassword),
        saltRounds
      );
      await admin.save();
    }

    // apply profile updates
    let updated = null;
    if (Object.keys(updates).length) {
      updated = await User.findByIdAndUpdate(
        adminId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select("-password -auths");
    } else {
      updated = await User.findById(adminId).select("-password -auths");
    }

    if (!updated)
      return ResponseUtils.error(res, "Admin profile not found", 404);
    ResponseUtils.success(
      res,
      { admin: updated },
      "Admin profile updated successfully"
    );
  } catch (err: any) {
    console.error("Admin updateProfile error:", err);
    ResponseUtils.error(
      res,
      err?.message || "Failed to update admin profile",
      500
    );
  }
});

/**
 * Generate admin report (writes JSON file to ./reports)
 * POST /api/v1/admin/reports/generate
 */
const generateReport = catchAsync(async (req: Request, res: Response) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    totalRiders,
    totalDrivers,
    pendingDriverApprovals,
    onlineDrivers,
    totalRides,
    completedRides,
    revenueAgg,
    recentRides,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "rider" }),
    Driver.countDocuments(),
    Driver.countDocuments({ approvalStatus: "pending" }),
    Driver.countDocuments({ isOnline: true, approvalStatus: "approved" }),
    Ride.countDocuments(),
    Ride.countDocuments({ status: "completed" }),
    Ride.aggregate([
      { $match: { status: "completed", createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$fare.actual" } } },
    ]),
    Ride.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("riderId", "firstName lastName email")
      .populate("driver", "firstName lastName email")
      .lean(),
  ]);

  const totalRevenueThisMonth = revenueAgg[0]?.total || 0;

  const report = {
    generatedAt: now.toISOString(),
    summary: {
      totalUsers,
      totalRiders,
      totalDrivers,
      pendingDriverApprovals,
      onlineDrivers,
      totalRides,
      completedRides,
      totalRevenueThisMonth,
    },
    recentRides,
  };

  // ensure reports directory exists
  const reportsDir = path.join(process.cwd(), "reports");
  await fs.mkdir(reportsDir, { recursive: true });

  const fileName = `admin-report-${now
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;
  const filePath = path.join(reportsDir, fileName);

  await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf8");

  return ResponseUtils.success(
    res,
    { fileName, filePath, report },
    "Admin report generated successfully"
  );
});


/**
 * GET /api/v1/admin/analytics/ride-volume?period=week|month|today
 */
const getRideVolume = catchAsync(async (req: Request, res: Response) => {
  const period = String(req.query.period || "week").toLowerCase();
  const now = new Date();
  let startDate: Date;

  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    // default = last 7 days (week)
    const d = new Date(now);
    d.setDate(d.getDate() - 6); // include today -> 7 days
    startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // Aggregation: group by date string YYYY-MM-DD
  const agg = await Ride.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: now } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: "UTC",
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Build map for quick lookup
  const map = new Map<string, number>();
  agg.forEach((r: any) => map.set(r._id, r.count));

  // Generate full series from startDate -> now (inclusive)
  const series: { date: string; count: number }[] = [];
  const cur = new Date(startDate);
  while (cur <= now) {
    const dateStr = cur.toISOString().slice(0, 10); // YYYY-MM-DD
    series.push({ date: dateStr, count: map.get(dateStr) || 0 });
    cur.setDate(cur.getDate() + 1);
  }

  return ResponseUtils.success(
    res,
    {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      series,
    },
    "Ride volume fetched"
  );
});

/**
 * GET /api/v1/admin/analytics/revenue?period=week|month|today
 * Returns time-series revenue for the chosen period and totals
 */
const getRevenueAnalytics = catchAsync(async (req: Request, res: Response) => {
  const period = String(req.query.period || "week").toLowerCase();
  const now = new Date();
  let startDate: Date;

  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    // last 7 days (include today)
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // aggregate revenue per day (UTC)
  const agg = await Ride.aggregate([
    {
      $match: {
        status: "completed",
        createdAt: { $gte: startDate, $lte: now },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: "UTC",
          },
        },
        totalRevenue: { $sum: { $ifNull: ["$fare.actual", 0] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = new Map<string, { totalRevenue: number; count: number }>();
  agg.forEach((r: any) =>
    map.set(r._id, { totalRevenue: r.totalRevenue || 0, count: r.count || 0 })
  );

  const series: { date: string; revenue: number; rides: number }[] = [];
  const cur = new Date(startDate);
  while (cur <= now) {
    const dateStr = cur.toISOString().slice(0, 10);
    const entry = map.get(dateStr) || { totalRevenue: 0, count: 0 };
    series.push({
      date: dateStr,
      revenue: entry.totalRevenue,
      rides: entry.count,
    });
    cur.setDate(cur.getDate() + 1);
  }

  const totalRevenue = series.reduce((s, it) => s + it.revenue, 0);
  const totalRides = series.reduce((s, it) => s + it.rides, 0);

  return ResponseUtils.success(
    res,
    {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalRevenue,
      totalRides,
      series,
    },
    "Revenue analytics fetched"
  );
});

/**
 * GET /api/v1/admin/analytics/driver-activity?period=week|month|today
 * Returns driver activity metrics and top drivers for the period
 */
const getDriverActivity = catchAsync(async (req: Request, res: Response) => {
  const period = String(req.query.period || "week").toLowerCase();
  const now = new Date();
  let startDate: Date;

  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    // last 7 days (include today)
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // parallel aggregates
  const [
    totalDrivers,
    approvedDrivers,
    onlineDrivers,
    newDrivers,
    ridesByDriverAgg,
    earningsByDriverAgg,
  ] = await Promise.all([
    Driver.countDocuments(),
    Driver.countDocuments({ approvalStatus: "approved" }),
    Driver.countDocuments({ isOnline: true, approvalStatus: "approved" }),
    Driver.countDocuments({ createdAt: { $gte: startDate } }),
    Ride.aggregate([
      {
        $match: {
          driverId: { $ne: null },
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      { $group: { _id: "$driverId", rides: { $sum: 1 } } },
      { $sort: { rides: -1 } },
    ]),
    Ride.aggregate([
      {
        $match: {
          driverId: { $ne: null },
          status: "completed",
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: "$driverId",
          earnings: { $sum: { $ifNull: ["$fare.actual", 0] } },
        },
      },
      { $sort: { earnings: -1 } },
    ]),
  ]);

  // build maps for quick lookup
  const ridesMap = new Map<string, number>();
  ridesByDriverAgg.forEach((r: any) =>
    ridesMap.set(String(r._id), r.rides || 0)
  );
  const earningsMap = new Map<string, number>();
  earningsByDriverAgg.forEach((r: any) =>
    earningsMap.set(String(r._id), r.earnings || 0)
  );

  // combine driver ids and compute combined score for top ranking
  const driverIds = Array.from(
    new Set([...ridesMap.keys(), ...earningsMap.keys()])
  );
  const combined = driverIds.map((id) => ({
    driverId: id,
    rides: ridesMap.get(id) || 0,
    earnings: earningsMap.get(id) || 0,
    score: (ridesMap.get(id) || 0) * 1 + (earningsMap.get(id) || 0) / 1000, // simple weighting
  }));
  combined.sort((a, b) => b.score - a.score);
  const topN = 5;
  const topDriversSlice = combined.slice(0, topN);
  const topDriverIds = topDriversSlice
    .map((d) => {
      try {
        return new (mongoose as any).Types.ObjectId(String(d.driverId));
      } catch {
        return null;
      }
    })
    .filter((id) => id !== null) as unknown as mongoose.Types.ObjectId[];

  // fetch driver profiles with user info
  const topDrivers = await Driver.find({ _id: { $in: topDriverIds } })
    .populate("userId", "firstName lastName email phone")
    .lean();

  // map driver profile by id for ordering
  const topDriverMap = new Map(topDrivers.map((d: any) => [String(d._id), d]));

  const topDriversResult = topDriversSlice.map((d) => ({
    driverId: d.driverId,
    rides: d.rides,
    earnings: d.earnings,
    profile: topDriverMap.get(d.driverId) || null,
  }));

  const avgRidesPerActiveDriver =
    ridesByDriverAgg.reduce((s: number, r: any) => s + (r.rides || 0), 0) /
      Math.max(1, ridesByDriverAgg.length) || 0;

  return ResponseUtils.success(
    res,
    {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      overview: {
        totalDrivers,
        approvedDrivers,
        onlineDrivers,
        newDrivers,
        driversWithRides: ridesByDriverAgg.length,
        avgRidesPerActiveDriver: Number(avgRidesPerActiveDriver.toFixed(2)),
      },
      topDrivers: topDriversResult,
    },
    "Driver activity analytics fetched"
  );
});




/**
 * GET /api/v1/admin/analytics/status-distribution?period=week|month|today
 * Returns counts and percentages per ride status for the period
 */
const getStatusDistribution = catchAsync(async (req: Request, res: Response) => {
  const period = String(req.query.period || "week").toLowerCase();
  const now = new Date();
  let startDate: Date;

  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    const d = new Date(now);
    d.setDate(d.getDate() - 6); // last 7 days incl today
    startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // aggregate counts by status
  const agg = await Ride.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: now } } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const total = agg.reduce((s: number, a: any) => s + (a.count || 0), 0);

  // ensure all statuses present with 0 if missing
  const allStatuses = [
    "requested",
    "accepted",
    "picked_up",
    "in_transit",
    "completed",
    "cancelled",
    "rejected",
    "waitlist",
  ];

  const map = new Map<string, number>();
  agg.forEach((a: any) => map.set(String(a._id), a.count || 0));

  const distribution = allStatuses.map((status) => {
    const count = map.get(status) || 0;
    const percent = total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0;
    return { status, count, percent };
  });

  return ResponseUtils.success(
    res,
    {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalRides: total,
      distribution,
    },
    "Status distribution fetched"
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
  getAllRiders,
  updateProfile,
  generateReport,
  getRideVolume,
  getRevenueAnalytics,
  getDriverActivity,
  getStatusDistribution,
};
