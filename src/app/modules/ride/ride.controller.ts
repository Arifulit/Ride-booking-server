import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import Ride, { IRide } from "./ride.model";
import Driver, { IDriver } from "../driver/driver.model";
import rideService from "./ride.service";
import ResponseUtils from "../../utils/response";

// Extend Express Request to include authenticated user & driver
// Use Express's Request with user?: IUser (from global type augmentation)

class RideController {
  static getMyRides = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const riderIdRaw = req.user?._id;
      if (
        !riderIdRaw ||
        typeof riderIdRaw !== "string" ||
        !mongoose.Types.ObjectId.isValid(riderIdRaw)
      ) {
        ResponseUtils.error(res, "Invalid rider ID", 400);
        return;
      }
      const riderId = new mongoose.Types.ObjectId(riderIdRaw);
      const rides = await Ride.find({ riderId }).sort({ createdAt: -1 });
      ResponseUtils.success(res, { rides }, "My rides fetched successfully");
    } catch (error: any) {
      next(error);
    }
  };

  static cancelRide = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { rideId } = req.params;
      const ride = await Ride.findById(rideId);
      if (!ride) {
        ResponseUtils.error(res, "Ride not found", 404);
        return;
      }
      ride.status = "cancelled";
      await ride.save();
      ResponseUtils.success(res, { ride }, "Ride cancelled successfully");
    } catch (error: any) {
      next(error);
    }
  };

  static rateDriver = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { rideId } = req.params;
      const { rating } = req.body;
      const ride = await Ride.findById(rideId);
      if (!ride) {
        ResponseUtils.error(res, "Ride not found", 404);
        return;
      }
      (ride.rating ??= {}).driverRating = rating;
      await ride.save();
      ResponseUtils.success(res, { ride }, "Driver rated successfully");
    } catch (error: any) {
      next(error);
    }
  };

  static rejectRide = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { rideId } = req.params;
      const ride = await Ride.findById(rideId);
      if (!ride) {
        ResponseUtils.error(res, "Ride not found", 404);
        return;
      }
      ride.status = "rejected";
      await ride.save();
      ResponseUtils.success(res, { ride }, "Ride rejected successfully");
    } catch (error: any) {
      next(error);
    }
  };

  static updateRideStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { rideId } = req.params;
      const { status } = req.body;
      const ride = await Ride.findById(rideId);
      if (!ride) {
        ResponseUtils.error(res, "Ride not found", 404);
        return;
      }
      ride.status = status;
      await ride.save();
      ResponseUtils.success(res, { ride }, "Ride status updated successfully");
    } catch (error: any) {
      next(error);
    }
  };

  static getRideDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { rideId } = req.params;
      const ride = await Ride.findById(rideId);
      if (!ride) {
        ResponseUtils.error(res, "Ride not found", 404);
        return;
      }
      ResponseUtils.success(res, { ride }, "Ride details fetched successfully");
    } catch (error: any) {
      next(error);
    }
  };
  /**
   * Get all rides with full history (Admin)
   */
  static getAllRidesHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const rides = await Ride.find().sort({ createdAt: -1 });
      ResponseUtils.success(
        res,
        { rides },
        "All rides history fetched successfully"
      );
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Search nearby drivers (Geo-based search)
   */
  static searchNearbyDrivers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { longitude, latitude, radius = 10 } = req.body;
      if (typeof longitude !== "number" || typeof latitude !== "number") {
        ResponseUtils.error(res, "longitude ও latitude লাগবে", 400);
        return;
      }
      const drivers = await rideService.findNearbyDrivers(
        longitude,
        latitude,
        radius
      );
      ResponseUtils.success(res, { drivers }, "Drivers fetched successfully");
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Admin dashboard analytics
   */
  static getAdminAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const User = require("../user/user.model").default;
      const [
        totalRides,
        completedRides,
        cancelledRides,
        activeRides,
        totalEarnings,
        totalUsers,
        totalDrivers,
      ] = await Promise.all([
        Ride.countDocuments(),
        Ride.countDocuments({ status: "completed" }),
        Ride.countDocuments({ status: "cancelled" }),
        Ride.countDocuments({
          status: { $in: ["requested", "accepted", "picked_up", "in_transit"] },
        }),
        Ride.aggregate([
          { $match: { status: "completed" } },
          { $group: { _id: null, total: { $sum: "$fare.actual" } } },
        ]),
        User.countDocuments(),
        Driver.countDocuments(),
      ]);
      ResponseUtils.success(
        res,
        {
          totalRides,
          completedRides,
          cancelledRides,
          activeRides,
          totalEarnings: totalEarnings[0]?.total || 0,
          totalUsers,
          totalDrivers,
        },
        "Admin analytics fetched successfully"
      );
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Ride fare estimation API
   */
  static estimateFare = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { pickupLocation, destination, rideType = "economy" } = req.body;
      if (!pickupLocation || !destination) {
        ResponseUtils.error(
          res,
          "pickupLocation ও destination লাগবে",
          400
        );
        return;
      }
      const estimates = rideService.calculateEstimates(
        pickupLocation,
        destination,
        rideType
      );
      ResponseUtils.success(res, estimates, "Estimated fare calculated");
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Request a new ride (Rider)
   */
  static requestRide = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      console.log("User in request:", req.user);
      const riderIdRaw =
        typeof req.user?._id === "object" && req.user?._id !== null
          ? req.user._id.toString()
          : (req.user?.id ? String(req.user.id) : undefined);
      if (
        !riderIdRaw ||
        typeof riderIdRaw !== "string" ||
        !mongoose.Types.ObjectId.isValid(riderIdRaw)
      ) {
        ResponseUtils.error(res, "Invalid rider ID", 400);
        return;
      }
      const riderId = new mongoose.Types.ObjectId(riderIdRaw);

      const {
        pickupLocation,
        destination,
        rideType = "economy",
        paymentMethod = "cash",
        notes,
      } = req.body;

      const activeRide = await Ride.findOne({
        riderId,
        status: { $in: ["requested", "accepted", "picked_up", "in_transit"] },
      });
      if (activeRide) {
        ResponseUtils.error(res, "You already have an active ride", 409);
        return;
      }

      const estimates = rideService.calculateEstimates(
        pickupLocation,
        destination,
        rideType
      );

      const ride = new Ride({
        riderId,
        pickupLocation,
        destination,
        rideType,
        paymentMethod,
        notes,
        fare: { estimated: estimates.fare },
        distance: { estimated: estimates.distance },
        duration: { estimated: estimates.duration },
      });

      await ride.save();
      await ride.populate("riderId", "firstName lastName phone");

      ResponseUtils.success(res, { ride }, "Ride requested successfully", 201);
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Accept a ride (Driver)
   */
  static acceptRide = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.log("User in request (driver):", req.user);
    try {
      const { rideId } = req.params;
      const driverIdRaw =
        typeof req.user?._id === "object" && req.user?._id !== null
          ? req.user._id.toString()
          : (req.user?.id ? String(req.user.id) : undefined);

      if (
        !driverIdRaw ||
        typeof driverIdRaw !== "string" ||
        !mongoose.Types.ObjectId.isValid(driverIdRaw)
      ) {
        ResponseUtils.error(res, "Invalid driver ID", 400);
        return;
      }
      const driverId = new mongoose.Types.ObjectId(driverIdRaw);
      const ride = await Ride.findOne({ _id: rideId, status: "requested" });
      if (!ride) {
        ResponseUtils.error(
          res,
          "Ride not found or already accepted",
          404
        );
        return;
      }
      ride.driverId = driverId;
      ride.status = "accepted";
      await ride.save();
      ResponseUtils.success(res, { ride }, "Ride accepted successfully");
    } catch (error: any) {
      next(error);
    }
  };

  // ... ✨ (the rest of methods like rejectRide, updateRideStatus, cancelRide, rateDriver, getMyRides, getRideDetails, getEarnings, getDetailedEarnings follow same conversion style with TS types)
}

export default RideController;

