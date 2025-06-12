import express from "express";
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  getCurrentUser,
} from "../controllers/authController.js";
import { authenticate, authenticateRefreshToken } from "../middleware/authMiddleware.js";
import validate from "../middleware/validationMiddleware.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  refreshTokenSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
} from "../validations/authValidations.js";

const router = express.Router();

// Public routes
router.post("/register", validate(registerSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.post(
  "/refresh-token",
  authenticateRefreshToken,
  validate(refreshTokenSchema),
  refreshAccessToken,
);
router.get("/verify-email", validate(verifyEmailSchema, "query"), verifyEmail);
router.post("/resend-verification", validate(resendVerificationSchema), resendVerificationEmail);

// Password reset routes
router.post("/forgot-password", validate(passwordResetRequestSchema), requestPasswordReset);
router.post("/reset-password", validate(passwordResetSchema), resetPassword);

// Protected routes
router.post("/logout", authenticate, logoutUser);
router.get("/me", authenticate, getCurrentUser);

export default router;
