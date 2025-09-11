
import { Router } from "express";
import asyncHandler from "express-async-handler";
import { RideController } from "./ride.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  authorize,
  requireApprovedDriver,
} from "../../middlewares/role.middleware";

const router = Router();

// -----------------------------
// Public & Rider/Admin routes
// -----------------------------
router.use(authenticate);

router.post(
  "/search-drivers",
  authorize(["rider", "admin"]),
  asyncHandler(RideController.searchNearbyDrivers)
);
router.post("/estimate", asyncHandler(RideController.requestRide)); // fare estimate
router.post(
  "/request",
  authorize(["rider"]),
  asyncHandler(RideController.requestRide)
);

// -----------------------------
// Rider ride management
// -----------------------------
router.get(
  "/my-rides",
  authorize(["rider"]),
  asyncHandler(RideController.getMyRides)
);
// Alias for /me for easier API usage
router.get(
  "/me",
  authorize(["rider"]),
  asyncHandler(RideController.getMyRides)
);
router.patch(
  "/:rideId/cancel",
  authorize(["rider"]),
  asyncHandler(RideController.cancelRide)
);
router.patch(
  "/:rideId/rate",
  authorize(["rider"]),
  asyncHandler(RideController.rateDriver)
);

// -----------------------------
// Driver ride management
// -----------------------------
router.patch(
  "/:rideId/accept",
  requireApprovedDriver,
  asyncHandler(RideController.acceptRide)
);
router.patch(
  "/:rideId/reject",
  requireApprovedDriver,
  asyncHandler(RideController.rejectRide)
);
router.patch(
  "/:rideId/status",
  authorize(["driver"]),
  asyncHandler(RideController.updateRideStatus)
);

// -----------------------------
// Shared route
// -----------------------------
router.get("/:rideId", asyncHandler(RideController.getRideDetails));

// -----------------------------
// Admin routes
// -----------------------------
router.get(
  "/history/all",
  authorize(["admin"]),
  asyncHandler(RideController.getAllRidesHistory)
);
router.get(
  "/admin/analytics",
  authorize(["admin"]),
  asyncHandler(RideController.getAdminAnalytics)
);

export const RideRoutes = router;
