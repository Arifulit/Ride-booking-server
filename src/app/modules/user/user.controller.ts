
import { Request, Response } from "express";
import User from "./user.model";
import Ride from "../ride/ride.model"; // assumes Ride model has paginate
import ResponseUtils from "../../utils/response";
import { IUser } from "./user.interface";
import { catchAsync } from "../../utils/catchAsync";

/**
 * Get ride history for a rider
 */
const getRideHistory = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IUser & {
    _id: string;
    getPublicProfile: () => Omit<IUser, "password">;
  };
  const userId = user._id;
  const { page = "1", limit = "10", status } = req.query;

  const query: Record<string, any> = { riderId: userId };
  if (status) query.status = status;

  const options = {
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
    sort: { createdAt: -1 },
    populate: [
      { path: "driver", select: "firstName lastName phone" },
      { path: "driverProfile", select: "vehicleInfo rating" },
    ],
  };

  const rides = await (Ride as any).paginate(query, options);

  ResponseUtils.paginated(
    res,
    rides.docs,
    {
      currentPage: rides.page,
      totalPages: rides.totalPages,
      totalRides: rides.totalDocs,
      hasNext: rides.hasNextPage,
      hasPrev: rides.hasPrevPage,
    },
    "Ride history retrieved successfully"
  );
});




/**
 * Get rider profile with summary
 */
const getProfile = catchAsync(async (req: Request, res: Response) => {
  const rider = await User.findOne({
    _id: (req as any).user._id,
    role: "rider",
  }).select("-password");

  if (!rider) {
    return ResponseUtils.error(res, "Rider profile not found", 404);
  }

  // Rider stats
  const [totalRides, totalSpent, recentRides] = await Promise.all([
    Ride.countDocuments({ riderId: rider._id, status: "completed" }),
    Ride.aggregate([
      { $match: { riderId: rider._id, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$fare.actual" } } },
    ]),
    Ride.find({ riderId: rider._id })
      .populate("driver", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  return ResponseUtils.success(
    res,
    {
      rider,
      stats: {
        totalCompletedRides: totalRides,
        totalSpent: totalSpent[0]?.total || 0,
      },
      recentRides,
    },
    "Rider profile and summary"
  );
});







/**
 * Get all users (admin only)
 */
const getAllUsers = catchAsync(async (_req: Request, res: Response) => {
  const users = await User.find().select("-password");
  ResponseUtils.success(res, { users }, "Users retrieved successfully");
});

/**
 * Update user profile
 */
const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IUser & {
    _id: string;
    getPublicProfile: () => Omit<IUser, "password">;
  };
  const userId = user._id;

  const allowedUpdates = ["firstName", "lastName", "phone", "profilePicture"];
  const updates: Partial<IUser> = {};

  Object.keys(req.body).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      (updates as any)[key] = (req.body as any)[key];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    ResponseUtils.error(res, "User not found", 404);
    return;
  }

  ResponseUtils.success(
    res,
    { user: updatedUser.getPublicProfile() },
    "Profile updated successfully"
  );
});

export const UserController = {
  getProfile,
  getAllUsers,
  updateProfile,
  getRideHistory,
};
