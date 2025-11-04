import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { AdminController } from "./admin.controller";
import path from "path";
const router = Router();

// Auth + admin role for all following routes
router.use(authenticate);
router.use(authorize(["admin"]));

// User management
router.get("/users", AdminController.getAllUsers);
router.get("/riders", AdminController.getAllRiders);
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
router.get("/rides/statistics", AdminController.getRideStats);

// System reports
router.get("/reports/overview", AdminController.getSystemOverview);
router.get("/reports/earnings", AdminController.getEarningsReport);
router.post("/reports/generate", AdminController.generateReport);

router.get("/reports/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(process.cwd(), "reports", fileName);
  res.download(filePath, fileName, (err) => {
    if (err) {
      res.status(404).json({ success: false, message: "Report not found" });
    }
  });
});


// Admin profile routes
router.get("/profile", AdminController.getProfile);
router.patch("/profile", AdminController.updateProfile);


router.get("/analytics/ride-volume", AdminController.getRideVolume);
// Analytics: revenue time-series
router.get("/analytics/revenue", AdminController.getRevenueAnalytics);
// Analytics: driver activity
router.get("/analytics/driver-activity", AdminController.getDriverActivity);

router.get("/analytics/status-distribution", AdminController.getStatusDistribution);
export const AdminRoutes = router;