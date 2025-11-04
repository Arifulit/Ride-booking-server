/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from "express";
import type { IUser } from "../user/user.interface";
import Driver from "../driver/driver.model";
import { IDriver } from "../driver/driver.interface";
import authService from "./auth.service";
import ResponseUtils from "../../utils/response";
import User from "../user/user.model";
import { catchAsync } from "../../utils/catchAsync";
import bcrypt from "bcryptjs";
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
  user: any;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  driverProfile?: IDriver;
}

interface ProfileResponse {
  user: any;
  driverProfile?: IDriver;
}

/**
 * Register a new user
 */
const register = catchAsync(
  async (
    req: Request<{}, AuthResponse, RegisterRequestBody>,
    res: Response<any>
  ) => {
    const { role, licenseNumber, vehicleInfo, ...userData } = req.body;

    // Check if user already exists
    const existingUser: IUser | null = await User.findOne({
      email: userData.email,
    });
    if (existingUser) {
      return ResponseUtils.error(
        res,
        "User already exists with this email",
        409
      );
    }
    // Create a new user
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
  }
);

/**
 * Login user
 */

const login = catchAsync(
  async (
    req: Request<{}, AuthResponse, LoginRequestBody>,
    res: Response<any>,
    next: NextFunction
  ) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return ResponseUtils.error(res, "Email and password required", 400);
    }

    const emailNormalized = String(email).trim().toLowerCase();

    // fetch including password
    const user = (await User.findOne({ email: emailNormalized }).select("+password")) as any;

    if (!user) {
      // console.log("[LOGIN] user not found:", emailNormalized);
      return ResponseUtils.error(res, "Invalid email or password", 401);
    }

 
    if (user.isBlocked) {
      return ResponseUtils.error(res, "Account has been blocked. Contact support.", 403);
    }

    if (!user.password) {
      console.log("[LOGIN] no password hash for user:", emailNormalized);
      return ResponseUtils.error(res, "No password set for this account. Use password reset.", 400);
    }

    // verify password
    const isPasswordValid = await bcrypt.compare(String(password), (user as any).password || "");
    console.log("[LOGIN] password compare result for", emailNormalized, ":", isPasswordValid);

    if (!isPasswordValid) {
      return ResponseUtils.error(res, "Invalid email or password", 401);
    }

    // Generate tokens and continue normal flow
    const tokens = authService.generateTokens(user);
    user.lastLogin = new Date();
    await user.save();

    let additionalData: { driverProfile?: IDriver } = {};
    if (user.role === "driver") {
      const driverProfile = (await Driver.findOne({ userId: user._id })) as any;
      if (driverProfile) additionalData.driverProfile = driverProfile;
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
  }
);

/**
 * Logout user
 */

const logout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    ResponseUtils.success(res, null, "Logout successful");
  }
);

/**
 * Get current user profile
 */
const getProfile = catchAsync(
  async (req: Request, res: Response<ProfileResponse>, next: NextFunction) => {
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
  }
);

/**
 * Update user profile
 */
const updateProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
    const { firstName, lastName, phone, profilePicture } = req.body;

    const updatedUser = (await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, phone, profilePicture },
      { new: true, runValidators: true }
    )) as any;

    if (!updatedUser) {
      return ResponseUtils.error(res, "User not found", 404);
    }

    ResponseUtils.success(
      res,
      {
        user: updatedUser.getPublicProfile(),
      },
      "Profile updated successfully"
    );
  }
);


const changePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?._id;
    if (!userId) return ResponseUtils.error(res, "Unauthenticated", 401);

    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return ResponseUtils.error(res, "oldPassword and newPassword are required", 400);
    }

    const user = (await User.findById(userId).select("+password")) as any;
    if (!user) return ResponseUtils.error(res, "User not found", 404);

    const isMatch = await bcrypt.compare(String(oldPassword), (user as any).password || "");
    if (!isMatch) return ResponseUtils.error(res, "Current password is incorrect", 400);

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUND || "10", 10);
    user.password = await bcrypt.hash(String(newPassword), saltRounds);
    await user.save();

    // do not return password
    ResponseUtils.success(res, null, "Password changed successfully");
  }
);





const AuthController = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
};

export default AuthController;
function setAuthCookie(res: Response<any, Record<string, any>>, userTokens: { accessToken: any; refreshToken: any; }) {
  throw new Error("Function not implemented.");
}

