import express from "express";
import {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  applyToJob,
  getJobApplications,
  getStudentApplications,
  updateApplicationStatus,
} from "../controllers/jobController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import validate from "../middleware/validationMiddleware.js";
import {
  createJobSchema,
  updateJobSchema,
  applyToJobSchema,
} from "../validations/jobValidations.js";
import { updateApplicationStatusSchema } from "../validations/applicationValidations.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Job routes
router.post("/", validate(createJobSchema), createJob);
router.get("/", getJobs);
router.get("/applications", getStudentApplications); // Get current student's applications
router.get("/:id", getJobById);
router.put("/:id", validate(updateJobSchema), updateJob);
router.delete("/:id", deleteJob);

// Application routes
router.post("/:id/apply", validate(applyToJobSchema), applyToJob);
router.get("/:id/applications", getJobApplications);
router.patch(
  "/:jobId/applications/:applicationId/status",
  validate(updateApplicationStatusSchema),
  updateApplicationStatus,
);

export default router;
