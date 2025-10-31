import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  authorize,
  requireApprovedDriver,
} from "../../middlewares/role.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import {
  updateProfileValidation,
  updateAvailabilityValidation,
  updateLocationValidation,
} from "./driver.validation";
import { DriverController } from "./driver.controller";
import { RideController } from "../ride/ride.controller";

// Custom Request type with user

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Profile routes
router.get(
  "/profile",
  authorize(["driver"]),
  (req: Request, res: Response, next: NextFunction) =>
    DriverController.getProfile(req, res, next)
);
router.patch(
  "/profile",
  authorize(["driver"]),
  validateBody(updateProfileValidation),
  (req: Request, res: Response, next: NextFunction) =>
    DriverController.updateProfile(req, res, next)
);


// Availability & Location
router.patch(
  "/availability",
  authorize(["driver"]),
  validateBody(updateAvailabilityValidation),
  (req, res, next) => DriverController.updateAvailability(req, res, next)
);


// ALIAS: accept /online-status as alternative path for availability toggle
router.patch(
  "/online-status",
  authorize(["driver"]),
  // call updateOnlineStatus which accepts { isOnline?: boolean, available?: boolean, location?: { lon, lat } }
  (req, res, next) => DriverController.updateOnlineStatus(req, res, next)
);


router.patch(
  "/location",
  authorize(["driver"]),
  validateBody(updateLocationValidation),
  (req: Request, res: Response, next: NextFunction) =>
    DriverController.updateLocation(req, res, next)
);

// Ride routes
router.get(
  "/rides/pending",
  requireApprovedDriver,
  (req: Request, res: Response, next: NextFunction) =>
    DriverController.getPendingRides(req, res, next)
);
// Allow drivers to fetch assigned or unassigned ride requests (same handler as ride module)
router.get(
  "/rides/requests",
  // requireApprovedDriver,
   authorize(["driver", "admin"]),
  (req: Request, res: Response, next: NextFunction) =>
    RideController.getAllRideRequests(req, res, next)
);
router.get(
  "/rides/active",
  authorize(["driver"]),
  (req: Request, res: Response, next: NextFunction) =>
    DriverController.getActiveRide(req, res, next)
);
router.get(
  "/rides/history",
  authorize(["driver"]),
  (req: Request, res: Response, next: NextFunction) =>
    DriverController.getRideHistory(req, res, next)
);

// Earnings routes
router.get(
  "/earnings",
  authorize(["driver"]),
  (req: Request, res: Response, next: NextFunction) =>
    DriverController.getEarnings(req, res, next)
);
router.get(
  "/earnings/detailed",
  authorize(["driver"]),
  (req: Request, res: Response, next: NextFunction) =>
    DriverController.getDetailedEarnings(req, res, next)
);
router.get(
  "/riders",
  authorize(["driver"]),
  (req: Request, res: Response, next: NextFunction) =>
    DriverController.getRidersList(req, res, next)
);

export const DriverRoutes = router;
