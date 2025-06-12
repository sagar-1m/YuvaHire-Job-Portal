import db from "../libs/db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../config/logger.js";

/**
 * Get all students for a college (Admin only)
 */
const getCollegeStudents = asyncHandler(async (req, res) => {
  // Check if user is an admin
  if (req.user.role !== "ADMIN") {
    throw new ApiError(403, "Only college admins can view students");
  }

  // Get the admin's college ID
  if (!req.user.admin || !req.user.admin.college) {
    throw new ApiError(400, "Admin is not associated with any college");
  }

  const collegeId = req.user.admin.college.id;
  const { search, page = 1, limit = 10 } = req.query;

  // Build where clause
  const where = {
    collegeId,
  };

  // Add search if provided
  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get students with user information
  const students = await db.student.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isVerified: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          applications: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: parseInt(limit),
  });

  // Get total count for pagination
  const totalStudents = await db.student.count({ where });
  const totalPages = Math.ceil(totalStudents / parseInt(limit));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        students,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: totalStudents,
          totalPages,
        },
      },
      "Students retrieved successfully",
    ),
  );
});

/**
 * Get student details by ID (Admin only)
 */
const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user is an admin
  if (req.user.role !== "ADMIN") {
    throw new ApiError(403, "Only college admins can view student details");
  }

  // Get the admin's college ID
  if (!req.user.admin || !req.user.admin.college) {
    throw new ApiError(400, "Admin is not associated with any college");
  }

  const collegeId = req.user.admin.college.id;

  // Get student with user information
  const student = await db.student.findUnique({
    where: { id: parseInt(id) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isVerified: true,
          createdAt: true,
        },
      },
      college: {
        select: {
          id: true,
          name: true,
          location: true,
        },
      },
      applications: {
        include: {
          job: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: { appliedAt: "desc" },
      },
    },
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  // Check if student belongs to admin's college
  if (student.collegeId !== collegeId) {
    throw new ApiError(403, "You can only view students from your college");
  }

  return res.status(200).json(new ApiResponse(200, { student }, "Student retrieved successfully"));
});

/**
 * Assign a student to a college (Admin only)
 */
const assignStudentToCollege = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  // Check if user is an admin
  if (req.user.role !== "ADMIN") {
    throw new ApiError(403, "Only college admins can assign students");
  }

  // Get the admin's college ID
  if (!req.user.admin || !req.user.admin.college) {
    throw new ApiError(400, "Admin is not associated with any college");
  }

  const collegeId = req.user.admin.college.id;

  // Find the student
  const student = await db.student.findUnique({
    where: { id: parseInt(studentId) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      college: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  // Check if student is already assigned to this college
  if (student.collegeId === collegeId) {
    throw new ApiError(400, "Student is already assigned to your college");
  }

  // Update the student's college
  const updatedStudent = await db.student.update({
    where: { id: parseInt(studentId) },
    data: { collegeId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      college: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  logger.info(`Student ${studentId} assigned to college ${collegeId} by admin ${req.user.id}`);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { student: updatedStudent }, "Student assigned to college successfully"),
    );
});

/**
 * Verify a student's college email domain (Admin only)
 */
const verifyStudentEmail = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  // Check if user is an admin
  if (req.user.role !== "ADMIN") {
    throw new ApiError(403, "Only college admins can verify student emails");
  }

  // Get the admin's college ID
  if (!req.user.admin || !req.user.admin.college) {
    throw new ApiError(400, "Admin is not associated with any college");
  }

  const collegeId = req.user.admin.college.id;

  // Find the student
  const student = await db.student.findUnique({
    where: { id: parseInt(studentId) },
    include: {
      user: true,
      college: true,
    },
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  // Check if student belongs to admin's college
  if (student.collegeId !== collegeId) {
    throw new ApiError(403, "You can only verify students from your college");
  }

  // Check if student is already verified
  if (student.user.isVerified) {
    throw new ApiError(400, "Student is already verified");
  }

  // Update the user's verification status
  const updatedUser = await db.user.update({
    where: { id: student.userId },
    data: {
      isVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
    },
  });

  logger.info(`Student ${studentId} verified by admin ${req.user.id}`);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        studentId: student.id,
        verified: true,
        studentName: student.user.name,
        studentEmail: student.user.email,
      },
      "Student verified successfully",
    ),
  );
});

export { getCollegeStudents, getStudentById, assignStudentToCollege, verifyStudentEmail };
