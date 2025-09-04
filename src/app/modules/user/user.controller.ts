import { Request, Response } from "express";
import User, { IUser } from "./user.model";
import Ride from "../ride/ride.model";
import ResponseUtils from "../../utils/response";

// Custom Request type যাতে req.user থাকে
interface AuthRequest extends Request {
  user: IUser & {
    _id: string;
    getPublicProfile: () => Omit<IUser, "password">;
  };
}

class UserController {
  /**
   * Get user profile
   */
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      ResponseUtils.success(
        res,
        { user: user.getPublicProfile() },
        "Profile retrieved successfully"
      );
    } catch (error) {
      console.error("Get profile error:", error);
      ResponseUtils.error(res, "Failed to retrieve profile", 500);
    }
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await User.find().select("-password");
      res.json({ success: true, users });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user._id;
      const allowedUpdates = ["firstName", "lastName", "phone", "profilePicture"];
      const updates: Partial<IUser> = {};

      // Filter allowed updates
      Object.keys(req.body).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          updates[key as keyof IUser] = req.body[key];
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
    } catch (error: any) {
      console.error("Update profile error:", error);
      ResponseUtils.error(res, error.message || "Failed to update profile", 500);
    }
  }

  /**
   * Get ride history for riders
   */
  static async getRideHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const riderId = req.user._id;
      const { page = "1", limit = "10", status } = req.query;

      const query: Record<string, any> = { riderId };
      if (status) {
        query.status = status;
      }

      const options = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        sort: { createdAt: -1 },
        populate: [
          { path: "driver", select: "firstName lastName phone" },
          { path: "driverProfile", select: "vehicleInfo rating" },
        ],
      };

      // যদি Ride paginate() method use করে (mongoose-paginate)
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
    } catch (error) {
      console.error("Get ride history error:", error);
      ResponseUtils.error(res, "Failed to retrieve ride history", 500);
    }
  }
}

export default UserController;
