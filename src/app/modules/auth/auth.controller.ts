import { Request, Response, NextFunction } from "express";
import type { IUser } from "../user/user.interface";
import Driver from "../driver/driver.model";
import { IDriver } from "../driver/driver.interface";
import authService from "./auth.service";
import ResponseUtils from "../../utils/response";
import User from "../user/user.model";
import { catchAsync } from "../../utils/catchAsync";
import AppError from "../../errorHelpers/AppError";
import passport from "passport";
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
    res: Response<any>,
    next: NextFunction
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
    const { email, password } = req.body;
    // console.log("Login request:", { email, password });

    // Find user by email
    const user = (await User.findOne({ email }).select("+password")) as any;

    // console.log("User found:", user);

    if (!user) {
      return ResponseUtils.error(res, "Invalid email or password", 401);
    }

    // console.log("Hashed password from DB:", user.password);
    // Check if user is blocked
    if (user.isBlocked) {
      return ResponseUtils.error(
        res,
        "Account has been blocked. Contact support.",
        403
      );
    }

    // Verify password
    const isPasswordValid: boolean = await user.checkPassword(password);

    // console.log("Password valid:", isPasswordValid);

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

const AuthController = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
};

export default AuthController;
function setAuthCookie(res: Response<any, Record<string, any>>, userTokens: { accessToken: any; refreshToken: any; }) {
  throw new Error("Function not implemented.");
}

