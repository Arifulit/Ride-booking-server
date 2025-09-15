
import { Router, Request, Response, NextFunction } from "express";
import { UserController } from "./user.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { validateUpdateProfile } from "./user.validation";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// User Show Profile route
router.get("/profile", (req: Request, res: Response, next: NextFunction) =>
  UserController.getProfile(req, res, next)
);
router.patch(
  "/profile",
  validateUpdateProfile,
  (req: Request, res: Response, next: NextFunction) =>
    UserController.updateProfile(req, res, next)
);

// Ride history for rider
router.get(
  "/rides/history",
  authorize(["rider"]),
  (req: Request, res: Response, next: NextFunction) =>
    UserController.getRideHistory(req, res, next)
);

// Admin: get all users
router.get(
  "/",
  authorize(["admin"]),
  (req: Request, res: Response, next: NextFunction) =>
    UserController.getAllUsers(req, res, next)
);

export default router;
