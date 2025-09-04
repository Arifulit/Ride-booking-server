import { Router } from "express";
import AuthController from "./auth.controller";
import { validateBody } from "../../middlewares/validation.middleware";
import { authenticate } from "../../middlewares/auth.middleware";

// Import validation schemas
import registerSchema from "./schemas/register.schema";
import loginSchema from "./schemas/login.schema";

// রাউটার তৈরি করা হচ্ছে
const router = Router();


// ✅ পাবলিক রুট - অথেন্টিকেশন লাগবে না
router.post("/register", validateBody(registerSchema), AuthController.register);
router.post("/login", validateBody(loginSchema), AuthController.login);

// ✅ প্রোটেক্টেড রুট - অথেন্টিকেশন লাগবে
router.post("/logout", authenticate, AuthController.logout);
router.get("/me", authenticate, AuthController.getProfile);
router.patch("/profile", authenticate, AuthController.updateProfile);

// এক্সপোর্ট হচ্ছে শুধু AuthRoutes
export const AuthRoutes = router;
