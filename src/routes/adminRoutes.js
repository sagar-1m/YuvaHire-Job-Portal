import express from "express";
import { createAdmin, getAdmins } from "../controllers/adminController.js";
import { authenticate, requireSuperAdmin } from "../middleware/authMiddleware.js";
import validate from "../middleware/validationMiddleware.js";
import { createAdminSchema } from "../validations/adminValidations.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes - only accessible to super admins
router.post("/", requireSuperAdmin, validate(createAdminSchema), createAdmin);
router.get("/", requireSuperAdmin, getAdmins);

export default router;
