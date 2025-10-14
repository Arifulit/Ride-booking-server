
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Ride from "./ride.model";
import RideService from "./ride.service";
import ResponseUtils from "../../utils/response";
import { catchAsync } from "../../utils/catchAsync";
// ...existing code...


// Rider: Get My Rides

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


// Rider: Cancel Ride

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


// Rider: Rate Driver

const rateDriver = catchAsync(async (req: Request, res: Response) => {
  const { rideId } = req.params;
  const { riderRating, riderComment } = req.body;

  const ride = await Ride.findById(rideId);
  if (!ride) {
    return ResponseUtils.error(res, "Ride not found", 404);
  }

  (ride.rating ??= {}).riderRating = riderRating; 
  (ride.feedback ??= {}).riderComment = riderComment;

  await ride.save();

  ResponseUtils.success(res, { ride }, "Driver rated successfully");
});



// Rider: Request Ride

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


// Driver: Accept Ride

const acceptRide = catchAsync(async (req: Request, res: Response) => {
  const { rideId } = req.params;
  const driverIdRaw = req.user?._id;

  // Validate driverId and rideId
  if (!driverIdRaw) {
    return ResponseUtils.error(res, "Driver not authenticated", 401);
  }
  const driverId =
    mongoose.Types.ObjectId.isValid(driverIdRaw)
      ? new mongoose.Types.ObjectId(driverIdRaw)
      : driverIdRaw;

  if (!rideId || !mongoose.Types.ObjectId.isValid(rideId)) {
    return ResponseUtils.error(res, "Invalid ride ID", 400);
  }

  // Find ride
  const ride = await Ride.findById(rideId);
  if (!ride) {
    return ResponseUtils.error(res, "Ride not found", 404);
  }

  // Check ride status
  if (ride.status !== "requested") {
    return ResponseUtils.error(
      res,
      `Cannot accept ride. Current status: ${ride.status}`,
      400
    );
  }

  // Assign driver and update status
  ride.driverId = driverId;
  ride.status = "accepted";
  await ride.save();

  return ResponseUtils.success(res, { ride }, "Ride accepted successfully");
});




// Driver: Reject Ride

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


// Driver: Update Ride Status

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


// Get Ride Details

const getRideDetails = catchAsync(async (req: Request, res: Response) => {
  const { rideId } = req.params;
  const ride = await Ride.findById(rideId);
  if (!ride) {
    ResponseUtils.error(res, "Ride not found", 404);
    return;
  }

  ResponseUtils.success(res, { ride }, "Ride details fetched successfully");
});


// Admin: Get All Rides

const getAllRidesHistory = catchAsync(async (req: Request, res: Response) => {
  const rides = await Ride.find().sort({ createdAt: -1 });
  ResponseUtils.success(
    res,
    { rides },
    "All rides history fetched successfully"
  );
});


// Admin: Analytics

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


// Rider/Admin: Search Nearby Drivers

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



// GET /rides/requests  (for drivers)
const getAllRideRequests = catchAsync(async (req: Request, res: Response) => {
  const driver = (req as any).user;
  if (!driver || !driver._id) {
    ResponseUtils.error(res, "Driver not authenticated", 401);
    return;
  }

  const {
    page = "1",
    limit = "20",
    status,      // optional: filter by status
    showAll,    // optional: show all statuses when true
    unassigned,  // optional: "true" => only driverId == null
    from,
    to,
    lat,
    lng,
    radiusKm = "5000",
  } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
  const limitNum = Math.max(parseInt(String(limit), 10) || 20, 1);
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, any> = {};

  // By default show recent request statuses. If status=all or showAll=true, do not filter by status
  if (status && status !== "all") {
    filter.status = status;
  } else if (showAll === "true" || status === "all") {
    // no status filter -> return all statuses
  } else {
    filter.status = { $in: ["requested", "pending"] };
  }

  // if unassigned=true then show only rides without driver
  if (unassigned === "true") {
    filter.driverId = null;
  } else {
    // otherwise show rides assigned to this driver OR unassigned (optional)
    // to show both unassigned and assigned to this driver, comment out next line
    // filter.driverId = driver._id;
    // we'll show both: assigned to this driver OR unassigned
    filter.$or = [{ driverId: driver._id }, { driverId: null }];
  }

  // date range filter
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  // optional geo filter on pickupLocation (if present in your schema as GeoJSON Point)
  if (lat && lng) {
    const maxDistance = Number(radiusKm) || 5000;
    filter.pickupLocation = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)],
        },
        $maxDistance: maxDistance,
      },
    };
  }

  const [totalDocs, items] = await Promise.all([
    Ride.countDocuments(filter),
    Ride.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      // populate rider with most non-sensitive fields so driver can see full rider profile
      .populate({
        path: "riderId",
        // exclude sensitive fields only (avoid mixing inclusion + exclusion)
        select: "-password -roles -isDeleted -resetPasswordToken -resetPasswordExpires",
      })
      .populate({
        path: "driverId",
        // exclude sensitive fields only
        select: "-password -roles -isDeleted",
      })
      .populate({
        path: "driverProfileId",
        // include vehicle details and any profile metadata
        select: "vehicle vehicleNumber vehicleType licenseNumber insurance expiryDate notes",
      })
      .lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalDocs / limitNum));
  const meta = {
    currentPage: pageNum,
    totalPages,
    totalRequests: totalDocs,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1,
  };

  // Use ResponseUtils.paginated (do not return the response object)
  if (ResponseUtils.paginated) {
    ResponseUtils.paginated(res, items, meta, "Ride requests fetched");
    return;
  }

  res.status(200).json({
    success: true,
    message: "Ride requests fetched",
    data: { items, ...meta },
    errors: null,
    timestamp: new Date().toISOString(),
  });
});

const getPendingRides = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Find all rides requested by riders (not yet accepted)
      const pendingRides = await Ride.find({
        status: "requested",
        driverId: null,
      })
        .populate("riderId", "firstName lastName email phone profilePicture")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        message: "Pending rider requests fetched successfully",
        count: pendingRides.length,
        data: pendingRides,
      });
    } catch (error) {
      next(error);
    }
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
  getAllRideRequests,
  getPendingRides
};
