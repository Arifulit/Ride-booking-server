
// import { NextFunction, Router, Request, Response } from "express";
// import asyncHandler from "express-async-handler";
// import { RideController } from "./ride.controller";
// import { authenticate } from "../../middlewares/auth.middleware";
// import {
//   authorize,
//   requireApprovedDriver,
// } from "../../middlewares/role.middleware";
// import { DriverController } from "../driver/driver.controller";

// const router = Router();

// // Public & Rider/Admin routes
// router.use(authenticate);

// router.post(
//   "/search-drivers",
//   authorize(["rider", "admin"]),
//   asyncHandler(RideController.searchNearbyDrivers)
// );
// // Fare estimate / ride request endpoints
// router.post("/estimate", asyncHandler(RideController.requestRide)); // keep if this maps to estimate in your controller
// router.post(
//   "/request",
//   authorize(["rider"]),
//   asyncHandler(RideController.requestRide)
// );

// // Rider ride management

// router.get(
//   "/my-rides",
//   authorize(["rider"]),
//   asyncHandler(RideController.getMyRides)
// );
// // Alias for /me for easier API usage
// router.get(
//   "/me",
//   authorize(["rider"]),
//   asyncHandler(RideController.getMyRides)
// );
// router.patch(
//   "/:rideId/cancel",
//   authorize(["rider"]),
//   asyncHandler(RideController.cancelRide)
// );
// router.patch(
//   "/:rideId/rate",
//   authorize(["rider"]),
//   asyncHandler(RideController.rateDriver)
// );


// // Driver ride management

// router.patch(
//   "/:rideId/accept",
//   requireApprovedDriver,
//   asyncHandler(RideController.acceptRide)
// );
// router.patch(
//   "/:rideId/reject",
//   requireApprovedDriver,
//   asyncHandler(RideController.rejectRide)
// );
// router.patch(
//   "/:rideId/status",
//   authorize(["driver"]),
//   asyncHandler(RideController.updateRideStatus)
// );


// // Shared route

// router.get("/:rideId", asyncHandler(RideController.getRideDetails));


// // Admin routes

// router.get(
//   "/history/all",
//   authorize(["admin"]),
//   asyncHandler(RideController.getAllRidesHistory)
// );
// router.get(
//   "/admin/analytics",
//   authorize(["admin"]),
//   asyncHandler(RideController.getAdminAnalytics)
// );
// router.get(
//   "/driver/rides/pending",
//   authenticate,
//   requireApprovedDriver,
//   (req: Request, res: Response, next: NextFunction) =>
//     DriverController.getPendingRides(req, res, next)
// );


// router.post(
//   "/request",
//   authorize(["rider"]),
//   asyncHandler(RideController.requestRide)
// );
// router.get(
//   "/details",
//   authorize(["admin"]),
//   asyncHandler(RideController.getAllRiderDetails)
// );


// // NEW: Active rides (static) - allow admin or driver (adjust roles if needed)
// router.get(
//   "/active",
//   authorize(["admin", "driver"]),
//   asyncHandler(RideController.getActiveRides)
// );
// // NEW: drivers can fetch requests (assigned to them OR unassigned)
// router.get("/requests", requireApprovedDriver, asyncHandler(RideController.getAllRideRequests));
// // Shared dynamic ride route (kept simple)
// // router.get("/:rideId", asyncHandler(RideController.getRideDetails));

// router.get("/:rideId", asyncHandler(RideController.getRideDetails));

// export const RideRoutes = router;


import { NextFunction, Router, Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { RideController } from "./ride.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize, requireApprovedDriver } from "../../middlewares/role.middleware";
import { DriverController } from "../driver/driver.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Public & Rider/Admin routes
router.post(
  "/search-drivers",
  authorize(["rider", "admin"]),
  asyncHandler(RideController.searchNearbyDrivers)
);

// Fare estimate / ride request endpoints
router.post("/estimate", asyncHandler(RideController.requestRide));
router.post("/request", authorize(["rider"]), asyncHandler(RideController.requestRide));

// Rider ride management
router.get("/my-rides", authorize(["rider"]), asyncHandler(RideController.getMyRides));
router.get("/me", authorize(["rider"]), asyncHandler(RideController.getMyRides));
router.patch("/:rideId/cancel", authorize(["rider"]), asyncHandler(RideController.cancelRide));
router.patch("/:rideId/rate", authorize(["rider"]), asyncHandler(RideController.rateDriver));

// Driver ride management
router.patch("/:rideId/accept", requireApprovedDriver, asyncHandler(RideController.acceptRide));
router.patch("/:rideId/reject", requireApprovedDriver, asyncHandler(RideController.rejectRide));
router.patch("/:rideId/status", authorize(["driver"]), asyncHandler(RideController.updateRideStatus));

// Driver-specific endpoints
router.get(
  "/driver/rides/pending",
  authenticate,
  requireApprovedDriver,
  (req: Request, res: Response, next: NextFunction) => DriverController.getPendingRides(req, res, next)
);
router.get("/requests", requireApprovedDriver, asyncHandler(RideController.getAllRideRequests));

// --- ADMIN / STATIC routes (must be BEFORE dynamic :rideId) ---
router.get("/history/all", authorize(["admin"]), asyncHandler(RideController.getAllRidesHistory));
router.get("/admin/analytics", authorize(["admin"]), asyncHandler(RideController.getAdminAnalytics));
// router.get("/details", authorize(["admin","rider"]), asyncHandler(RideController.getAllRiderDetails));
router.get("/all-riders", authorize(["admin","rider"]), asyncHandler(RideController.getAllRiders));
router.get("/active", authorize(["admin", "driver"]), asyncHandler(RideController.getActiveRides));

// DYNAMIC route: keep at the very end so static routes match first
router.get("/:rideId", asyncHandler(RideController.getRideDetails));
// GET /api/v1/rider/rides
router.get(
  "/rider/rides",
  (req: Request, res: Response, next: NextFunction) =>
    RideController.getRiderRides(req, res, next)
);
export const RideRoutes = router;