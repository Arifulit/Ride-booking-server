/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Router, Request, Response, NextFunction } from "express";
import { UserController } from "./user.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { validateUpdateProfile } from "./user.validation";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

router.get(
  "/profile",
  authorize(["rider"]),
  (req, res, next) => UserController.getProfile(req, res, next)
);

router.patch(
  "/profile",
  authorize(["rider"]),
  (req, res, next) => UserController.updateProfile(req, res, next)
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

// router.patch("/profile/password", (req, res, next) => UserController.changePassword(req, res, next));

export default router;
