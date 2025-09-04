import { Router } from "express";
import DriverController from "./driver.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  authorize,
  requireApprovedDriver,
} from "../../middlewares/role.middleware";
import {
  validateBody,
  validateParams,
} from "../../middlewares/validation.middleware";

const router: Router = Router();

// সব রুটে Authentication লাগবে
router.use(authenticate);

// Driver profile routes

// টাইপ সেফটি নিশ্চিত করতে কাস্টম হ্যান্ডলার
router.get("/profile", authorize(["driver"]), (req, res, next) =>
  DriverController.getProfile(req as any, res)
);
router.patch("/profile", authorize(["driver"]), (req, res, next) =>
  DriverController.updateProfile(req as any, res)
);

// Driver availability & location

router.patch("/availability", authorize(["driver"]), (req, res, next) =>
  DriverController.updateAvailability(req as any, res)
);
router.patch("/location", authorize(["driver"]), (req, res, next) =>
  DriverController.updateLocation(req as any, res)
);

// Ride management for drivers

router.get("/rides/pending", requireApprovedDriver, (req, res, next) =>
  DriverController.getPendingRides(req as any, res)
);
router.get("/rides/active", authorize(["driver"]), (req, res, next) =>
  DriverController.getActiveRide(req as any, res)
);
router.get("/rides/history", authorize(["driver"]), (req, res, next) =>
  DriverController.getRideHistory(req as any, res)
);

// Earnings

router.get("/earnings", authorize(["driver"]), (req, res, next) =>
  DriverController.getEarnings(req as any, res)
);
router.get("/earnings/detailed", authorize(["driver"]), (req, res, next) =>
  DriverController.getDetailedEarnings(req as any, res)
);

export const DriverRoutes = router;
