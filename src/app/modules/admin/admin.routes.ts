
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { AdminController } from "./admin.controller";

const router = Router();

// Admin registration (public)
router.post("/register", AdminController.adminRegister);

// Auth + admin role for all following routes
router.use(authenticate);
router.use(authorize(["admin"]));

// User management
router.get("/users", AdminController.getAllUsers);
router.patch("/users/:userId/block", AdminController.blockUser);
router.patch("/users/:userId/unblock", AdminController.unblockUser);

// Driver management
router.get("/drivers", AdminController.getAllDrivers);
router.get("/drivers/pending", AdminController.getPendingDrivers);
router.patch("/drivers/:driverId/approve", AdminController.approveDriver);
router.patch("/drivers/:driverId/reject", AdminController.rejectDriver);
router.patch("/drivers/:driverId/suspend", AdminController.suspendDriver);

// Ride management
router.get("/rides", AdminController.getAllRides);
router.get("/rides/stats", AdminController.getRideStats);

// System reports
router.get("/reports/overview", AdminController.getSystemOverview);
router.get("/reports/earnings", AdminController.getEarningsReport);

export const AdminRoutes = router;
