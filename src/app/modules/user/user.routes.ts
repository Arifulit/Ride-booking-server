import { Router } from "express";
import UserController from "./user.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";

// রাউটার তৈরি করা হচ্ছে
const router: Router = Router();


// সব রুটে অথেন্টিকেশন লাগবে
router.use(authenticate);

// ইউজার প্রোফাইল রুট

// টাইপ সেফটি নিশ্চিত করতে কাস্টম হ্যান্ডলার
router.get("/profile", (req, res, next) => UserController.getProfile(req as any, res));
router.patch("/profile", (req, res, next) => UserController.updateProfile(req as any, res));

// শুধু রাইডারদের জন্য রাইড হিস্ট্রি

router.get("/rides/history", authorize(["rider"]), (req, res, next) => UserController.getRideHistory(req as any, res));

// শুধু অ্যাডমিনদের জন্য সব ইউজার

router.get("/", authorize(["admin"]), (req, res, next) => UserController.getAllUsers(req, res));

// এক্সপোর্ট হচ্ছে শুধু UserRoutes
export const UserRoutes: Router = router;
