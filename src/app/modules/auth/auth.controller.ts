import { Request, Response, NextFunction } from "express";
import type { IUser } from "../user/user.interface";
import Driver from "../driver/driver.model";
import { IDriver } from "../driver/driver.interface";
import authService from "./auth.service";
import ResponseUtils from "../../utils/response";
import User from "../user/user.model";

// Interface definitions for request bodies
interface RegisterRequestBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role: "rider" | "driver" | "admin";
  licenseNumber?: string;
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
  };
}

interface LoginRequestBody {
  email: string;
  password: string;
}

interface UpdateProfileRequestBody {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePicture?: string;
}


// Response data interfaces
interface AuthResponse {
  user: any; // Public profile type
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  driverProfile?: IDriver;
}

interface ProfileResponse {
  user: any; // Public profile type
  driverProfile?: IDriver;
}

class AuthController {
  /**
   * Register a new user
   */
  static async register(
    req: Request<{}, AuthResponse, RegisterRequestBody>,
    res: Response<any>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { role, licenseNumber, vehicleInfo, ...userData } = req.body;

      // Check if user already exists
      const existingUser: IUser | null = await User.findOne({
        email: userData.email,
      });
      if (existingUser) {
        ResponseUtils.error(res, "User already exists with this email", 409);
        return;
      }

      // Create a new user (as a Mongoose Document)
      const user = new User({ ...userData, role }) as any;
      await user.save();

      // If driver, create driver profile
      if (role === "driver") {
        const driver = new Driver({
          userId: user._id,
          licenseNumber,
          vehicleInfo,
        }) as any;
        await driver.save();
      }

      // Generate tokens
      const tokens = authService.generateTokens(user);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      ResponseUtils.success(
        res,
        {
          user: user.getPublicProfile(),
          tokens,
        },
        "Registration successful",
        201
      );
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  }

  /**
   * Login user
   */
  static async login(
    req: Request<{}, AuthResponse, LoginRequestBody>,
    res: Response<any>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = (await User.findOne({ email }).select("+password")) as any;
      if (!user) {
        ResponseUtils.error(res, "Invalid email or password", 401);
      }

      // Check if user is blocked
      if (user.isBlocked) {
        ResponseUtils.error(
          res,
          "Account has been blocked. Contact support.",
          403
        );
      }

      // Verify password
      const isPasswordValid: boolean = await user.checkPassword(password);
      if (!isPasswordValid) {
        ResponseUtils.error(res, "Invalid email or password", 401);
      }

      // Generate tokens
      const tokens = authService.generateTokens(user);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Get additional info for drivers

      let additionalData: { driverProfile?: IDriver } = {};
      if (user.role === "driver") {
        const driverProfile = (await Driver.findOne({
          userId: user._id,
        })) as any;
        if (driverProfile) {
          additionalData.driverProfile = driverProfile;
        }
      }

      ResponseUtils.success(
        res,
        {
          user: user.getPublicProfile(),
          tokens,
          ...additionalData,
        },
        "Login successful"
      );
    } catch (error) {
      console.error("Login error:", error);
      next(error);
    }
  }

  /**
   * Logout user
   */
  static async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // In a real application, you might want to blacklist the token
      // For now, we'll just send a success response
      ResponseUtils.success(res, null, "Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(
    req: Request,
    res: Response<ProfileResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user as any;
      let profileData: ProfileResponse = { user: user.getPublicProfile() };

      // If driver, add driver profile
      if (user.role === "driver") {
        const driverProfile = (await Driver.findOne({
          userId: user._id,
        })) as any;
        if (driverProfile) {
          profileData.driverProfile = driverProfile;
        }
      }

      ResponseUtils.success(res, profileData, "Profile retrieved successfully");
    } catch (error) {
      console.error("Get profile error:", error);
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?._id;
      const { firstName, lastName, phone, profilePicture } = req.body;

      const updatedUser = (await User.findByIdAndUpdate(
        userId,
        { firstName, lastName, phone, profilePicture },
        { new: true, runValidators: true }
      )) as any;

      if (!updatedUser) {
        ResponseUtils.error(res, "User not found", 404);
        return;
      }

      ResponseUtils.success(
        res,
        {
          user: updatedUser.getPublicProfile(),
        },
        "Profile updated successfully"
      );
    } catch (error) {
      console.error("Update profile error:", error);
      next(error);
    }
  }
}

export default AuthController;
