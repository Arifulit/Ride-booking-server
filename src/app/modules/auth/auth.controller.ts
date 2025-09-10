import { Request, Response } from "express";
import User, { IUser } from "../user/user.model";
import Driver, { IDriver } from "../driver/driver.model";
import authService from "./auth.service";
import ResponseUtils from "../../utils/response";

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

// Extended Request interface with user property
// Use Express's Request with user?: IUser (from global type augmentation)

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
    res: Response<any>
  ): Promise<void> {
    try {
      const { role, licenseNumber, vehicleInfo, ...userData } = req.body;

      // Check if user already exists
      const existingUser: IUser | null = await User.findOne({ email: userData.email });
      if (existingUser) {
        return ResponseUtils.error(res, "User already exists with this email", 409);
      }


      // নতুন ইউজার তৈরি (Mongoose Document হিসেবে)
      const user = new User({ ...userData, role }) as any;
      await user.save();

      // যদি ড্রাইভার হয়, ড্রাইভার প্রোফাইল তৈরি করুন
      if (role === "driver") {
        const driver = new Driver({
          userId: user._id,
          licenseNumber,
          vehicleInfo
        }) as any;
        await driver.save();
      }

      // Generate tokens
      const tokens = authService.generateTokens(user);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      return ResponseUtils.success(res, {
        user: user.getPublicProfile(),
        tokens
      }, "Registration successful", 201);

    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "Registration failed";
      return ResponseUtils.error(res, errorMessage, 500);
    }
  }

  /**
   * Login user
   */
  static async login(
    req: Request<{}, AuthResponse, LoginRequestBody>, 
    res: Response<any>
  ): Promise<void> {
    try {
      const { email, password } = req.body;


      // ইমেইল দিয়ে ইউজার খুঁজুন
      const user = await User.findOne({ email }).select("+password") as any;
      if (!user) {
        return ResponseUtils.error(res, "Invalid email or password", 401);
      }

      // Check if user is blocked
      if (user.isBlocked) {
        return ResponseUtils.error(res, "Account has been blocked. Contact support.", 403);
      }

      // Verify password
      const isPasswordValid: boolean = await user.checkPassword(password);
      if (!isPasswordValid) {
        return ResponseUtils.error(res, "Invalid email or password", 401);
      }

      // Generate tokens
      const tokens = authService.generateTokens(user);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Get additional info for drivers

      let additionalData: { driverProfile?: IDriver } = {};
      if (user.role === "driver") {
        const driverProfile = await Driver.findOne({ userId: user._id }) as any;
        if (driverProfile) {
          additionalData.driverProfile = driverProfile;
        }
      }

      return ResponseUtils.success(res, {
        user: user.getPublicProfile(),
        tokens,
        ...additionalData
      }, "Login successful");

    } catch (error) {
      console.error("Login error:", error);
      return ResponseUtils.error(res, "Login failed", 500);
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response): Promise<Response | void> {
    try {
      // In a real application, you might want to blacklist the token
      // For now, we'll just send a success response
      return ResponseUtils.success(res, null, "Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
      return ResponseUtils.error(res, "Logout failed", 500);
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(
    req: Request, 
    res: Response<ProfileResponse>
  ): Promise<void> {
    try {

      const user = req.user as any;
      let profileData: ProfileResponse = { user: user.getPublicProfile() };

      // যদি ড্রাইভার হয়, ড্রাইভার প্রোফাইল যোগ করুন
      if (user.role === "driver") {
        const driverProfile = await Driver.findOne({ userId: user._id }) as any;
        if (driverProfile) {
          profileData.driverProfile = driverProfile;
        }
      }

      return ResponseUtils.success(res, profileData, "Profile retrieved successfully");
    } catch (error) {
      console.error("Get profile error:", error);
      return ResponseUtils.error(res, "Failed to retrieve profile", 500);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    req: Request, 
    res: Response
  ): Promise<void> {
    try {
  const userId = req.user?._id;
      const { firstName, lastName, phone, profilePicture } = req.body;


      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { firstName, lastName, phone, profilePicture },
        { new: true, runValidators: true }
      ) as any;

      if (!updatedUser) {
        return ResponseUtils.error(res, "User not found", 404);
      }

      return ResponseUtils.success(res, {
        user: updatedUser.getPublicProfile()
      }, "Profile updated successfully");

    } catch (error) {
      console.error("Update profile error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
      return ResponseUtils.error(res, errorMessage, 500);
    }
  }
}

export default AuthController;