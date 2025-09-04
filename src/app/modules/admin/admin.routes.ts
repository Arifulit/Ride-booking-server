
import express, { Router } from "express";
import adminController from "./admin.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import validationMiddlewares from "../../middlewares/validation.middleware";

const { validateParams, validateQuery } = validationMiddlewares;

export const router = Router();


// Admin registration (public)
router.post("/register", adminController.adminRegister);

// All routes below require authentication and admin role
router.use(authenticate);
router.use(authorize(["admin"]));

// User management
router.get("/users", adminController.getAllUsers);
router.patch("/users/:userId/block", adminController.blockUser);
router.patch("/users/:userId/unblock", adminController.unblockUser);

// Driver management
router.get("/drivers", adminController.getAllDrivers);
router.get("/drivers/pending", adminController.getPendingDrivers);
router.patch("/drivers/:driverId/approve", adminController.approveDriver);
router.patch("/drivers/:driverId/reject", adminController.rejectDriver);
router.patch("/drivers/:driverId/suspend", adminController.suspendDriver);

// Ride management
router.get("/rides", adminController.getAllRides);
router.get("/rides/stats", adminController.getRideStats);

// System reports
router.get("/reports/overview", adminController.getSystemOverview);
router.get("/reports/earnings", adminController.getEarningsReport);

// Bangla: router ke default export kora hocche
export const AdminRoutes = router;