
import { Request, Response } from "express";
import mongoose from "mongoose";
import Ride from "./ride.model";
import RideService from "./ride.service";
import ResponseUtils from "../../utils/response";
import { catchAsync } from "../../utils/catchAsync";
import { IRide } from "./ride.interface";

// -----------------------------
// Rider: Get My Rides
// -----------------------------
const getMyRides = catchAsync(async (req: Request, res: Response) => {
  const riderIdRaw = req.user?._id;
  if (!riderIdRaw || !mongoose.Types.ObjectId.isValid(String(riderIdRaw))) {
    ResponseUtils.error(res, "Invalid rider ID", 400);
    return;
  }

  const rides = await Ride.find({ riderId: riderIdRaw }).sort({
    createdAt: -1,
  });
  ResponseUtils.success(res, { rides }, "My rides fetched successfully");
});

// -----------------------------
// Rider: Cancel Ride
// -----------------------------
const cancelRide = catchAsync(async (req: Request, res: Response) => {
  const { rideId } = req.params;
  const ride = await Ride.findById(rideId);
  if (!ride) {
    ResponseUtils.error(res, "Ride not found", 404);
    return;
  }

  ride.status = "cancelled";
  await ride.save();
  ResponseUtils.success(res, { ride }, "Ride cancelled successfully");
});

// -----------------------------
// Rider: Rate Driver
// -----------------------------
const rateDriver = catchAsync(async (req: Request, res: Response) => {
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
});

// -----------------------------
// Rider: Request Ride
// -----------------------------
const requestRide = catchAsync(async (req: Request, res: Response) => {
  const riderId = req.user?._id;
  if (!riderId) {
    ResponseUtils.error(res, "Invalid rider ID", 400);
    return;
  }

  const { pickupLocation, destination, rideType = "economy" } = req.body;

  // Check for active ride
  const activeRide = await Ride.findOne({
    riderId,
    status: { $in: ["requested", "accepted", "picked_up", "in_transit"] },
  });
  if (activeRide) {
    ResponseUtils.error(res, "You already have an active ride", 409);
    return;
  }

  const estimates = RideService.calculateEstimates(
    pickupLocation,
    destination,
    rideType
  );

  const ride = new Ride({
    riderId,
    pickupLocation,
    destination,
    rideType,
    fare: { estimated: estimates.fare },
    distance: { estimated: estimates.distance },
    duration: { estimated: estimates.duration },
  });

  await ride.save();
  ResponseUtils.success(res, { ride }, "Ride requested successfully", 201);
});

// -----------------------------
// Driver: Accept Ride
// -----------------------------
// const acceptRide = catchAsync(async (req: Request, res: Response) => {
//   const { rideId } = req.params;
//   const driverId = req.user?._id;
//   if (!driverId || !mongoose.Types.ObjectId.isValid(String(driverId))) {
//     ResponseUtils.error(res, "Invalid driver ID", 400);
//     return;
//   }

//   const ride = await Ride.findOne({ _id: rideId, status: "requested" });
//   if (!ride) {
//     ResponseUtils.error(res, "Ride not found or already accepted", 404);
//     return;
//   }

//   ride.driverId = driverId;
//   ride.status = "accepted";
//   await ride.save();
//   ResponseUtils.success(res, { ride }, "Ride accepted successfully");
// });


const acceptRide = catchAsync(async (req: Request, res: Response) => {
  const { rideId } = req.params;
  const driverId = req.user?._id;

  // Validate driverId
  if (!driverId || !mongoose.Types.ObjectId.isValid(String(driverId))) {
    return ResponseUtils.error(res, "Invalid driver ID", 400);
  }

  // Validate rideId
  if (!rideId || !mongoose.Types.ObjectId.isValid(rideId)) {
    return ResponseUtils.error(res, "Invalid ride ID", 400);
  }

  // Find the ride
  const ride: IRide | null = await Ride.findById(rideId);
  if (!ride) {
    return ResponseUtils.error(res, "Ride not found", 404);
  }

  // Check if ride is already accepted or not in "requested" status
  if (ride.status !== "requested") {
    return ResponseUtils.error(res, `Cannot accept ride. Current status: ${ride.status}`, 400);
  }

  // Accept the ride
  ride.driverId = driverId;
  ride.status = "accepted";
  await ride.save();

  return ResponseUtils.success(res, { ride }, "Ride accepted successfully");
});


// -----------------------------
// Driver: Reject Ride
// -----------------------------
const rejectRide = catchAsync(async (req: Request, res: Response) => {
  const { rideId } = req.params;
  const ride = await Ride.findById(rideId);
  if (!ride) {
    ResponseUtils.error(res, "Ride not found", 404);
    return;
  }

  ride.status = "rejected";
  await ride.save();
  ResponseUtils.success(res, { ride }, "Ride rejected successfully");
});

// -----------------------------
// Driver: Update Ride Status
// -----------------------------
const updateRideStatus = catchAsync(async (req: Request, res: Response) => {
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
});

// -----------------------------
// Get Ride Details
// -----------------------------
const getRideDetails = catchAsync(async (req: Request, res: Response) => {
  const { rideId } = req.params;
  const ride = await Ride.findById(rideId);
  if (!ride) {
    ResponseUtils.error(res, "Ride not found", 404);
    return;
  }

  ResponseUtils.success(res, { ride }, "Ride details fetched successfully");
});

// -----------------------------
// Admin: Get All Rides
// -----------------------------
const getAllRidesHistory = catchAsync(async (req: Request, res: Response) => {
  const rides = await Ride.find().sort({ createdAt: -1 });
  ResponseUtils.success(
    res,
    { rides },
    "All rides history fetched successfully"
  );
});

// -----------------------------
// Admin: Analytics
// -----------------------------
const getAdminAnalytics = catchAsync(async (req: Request, res: Response) => {
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
    require("../driver/driver.model").default.countDocuments(),
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
});

// -----------------------------
// Rider/Admin: Search Nearby Drivers
// -----------------------------
const searchNearbyDrivers = catchAsync(async (req: Request, res: Response) => {
  const { longitude, latitude, radius = 10 } = req.body;
  if (typeof longitude !== "number" || typeof latitude !== "number") {
    ResponseUtils.error(res, "Longitude and latitude required", 400);
    return;
  }

  const drivers = await RideService.findNearbyDrivers(
    longitude,
    latitude,
    radius
  );
  ResponseUtils.success(res, { drivers }, "Drivers fetched successfully");
});

export const RideController = {
  getMyRides,
  cancelRide,
  rateDriver,
  requestRide,
  acceptRide,
  rejectRide,
  updateRideStatus,
  getRideDetails,
  getAllRidesHistory,
  getAdminAnalytics,
  searchNearbyDrivers,
};
