import express from "express";
import {
  getCollegeStudents,
  getStudentById,
  assignStudentToCollege,
  verifyStudentEmail,
} from "../controllers/studentController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(authenticateJWT);

router.get("/", getCollegeStudents);

router.get("/:id", getStudentById);

router.post("/:studentId/assign", assignStudentToCollege);

router.post("/:studentId/verify", verifyStudentEmail);

export default router;
