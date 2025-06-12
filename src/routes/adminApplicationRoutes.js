import express from "express";
import {
  applyForAdminRole,
  listAdminApplications,
  getAdminApplication,
  reviewAdminApplication,
  listActiveColleges,
} from "../controllers/adminApplicationController.js";
import { authenticateJWT, requireSuperAdmin } from "../middleware/authMiddleware.js";
import validate from "../middleware/validationMiddleware.js";
import {
  adminApplicationSchema,
  reviewApplicationSchema,
  listCollegesSchema,
} from "../validations/adminApplicationValidations.js";

const router = express.Router();

router.post("/", validate(adminApplicationSchema), applyForAdminRole);

router.get("/", authenticateJWT, requireSuperAdmin, listAdminApplications);

router.get("/:id", authenticateJWT, requireSuperAdmin, getAdminApplication);

router.post(
  "/review",
  authenticateJWT,
  requireSuperAdmin,
  validate(reviewApplicationSchema),
  reviewAdminApplication,
);

router.get("/colleges", validate(listCollegesSchema), listActiveColleges);

export default router;
