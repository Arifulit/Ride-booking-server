import { Router } from "express";
import asyncHandler from "express-async-handler";
import RideController from "./ride.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize, requireApprovedDriver } from "../../middlewares/role.middleware";

const router: Router = Router();

// -----------------------------
// Geo-based driver search (Rider & Admin)
// -----------------------------
router.post(
  "/search-drivers",
  authenticate,
  authorize(["rider", "admin"]),
  asyncHandler(RideController.searchNearbyDrivers)
);

// -----------------------------
// All routes require authentication
// -----------------------------
router.use(authenticate);

// -----------------------------
// Ride fare estimation
// -----------------------------
router.post("/estimate", asyncHandler(RideController.estimateFare));

// -----------------------------
// Request a new ride (Rider only)
// -----------------------------
router.post("/request", authorize(["rider"]), asyncHandler(RideController.requestRide));

// -----------------------------
// Rider ride management
// -----------------------------
router.get("/my-rides", authorize(["rider"]), asyncHandler(RideController.getMyRides));
router.patch("/:rideId/cancel", authorize(["rider"]), asyncHandler(RideController.cancelRide));
router.patch("/:rideId/rate", authorize(["rider"]), asyncHandler(RideController.rateDriver));

// -----------------------------
// Driver ride management
// -----------------------------
router.patch("/:rideId/accept", requireApprovedDriver, asyncHandler(RideController.acceptRide));
router.patch("/:rideId/reject", requireApprovedDriver, asyncHandler(RideController.rejectRide));
router.patch("/:rideId/status", authorize(["driver"]), asyncHandler(RideController.updateRideStatus));

// -----------------------------
// Shared route
// -----------------------------
router.get("/:rideId", asyncHandler(RideController.getRideDetails));

// -----------------------------
// Admin routes
// -----------------------------
router.get("/history/all", authorize(["admin"]), asyncHandler(RideController.getAllRidesHistory));
router.get("/admin/analytics", authorize(["admin"]), asyncHandler(RideController.getAdminAnalytics));

export const RideRoutes = router;
