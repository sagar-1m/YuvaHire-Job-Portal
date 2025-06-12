import express from "express";
import { getColleges, getCollegeById, updateCollege } from "../controllers/collegeController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import validate from "../middleware/validationMiddleware.js";
import { updateCollegeSchema } from "../validations/collegeValidations.js";

const router = express.Router();

// Public routes
router.get("/", getColleges);
router.get("/:id", getCollegeById);

// Protected routes
router.put("/:id", authenticate, validate(updateCollegeSchema), updateCollege);

export default router;
