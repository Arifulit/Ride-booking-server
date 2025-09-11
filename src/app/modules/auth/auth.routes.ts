import { Router } from "express";
import AuthController from "./auth.controller";
import { validateBody } from "../../middlewares/validation.middleware";
import { authenticate } from "../../middlewares/auth.middleware";

// Import validation schemas
import registerSchema from "./schemas/register.schema";
import loginSchema from "./schemas/login.schema";

const router = Router();

//  Public routes - No authentication required
router.post("/register", validateBody(registerSchema), AuthController.register);
router.post("/login", validateBody(loginSchema), AuthController.login);

//  Protected routes - Authentication required
router.post("/logout", authenticate, AuthController.logout);
router.get("/me", authenticate, AuthController.getProfile);
router.patch("/profile", authenticate, AuthController.updateProfile);

// Export only AuthRoutes
export const AuthRoutes = router;
