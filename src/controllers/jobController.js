import db from "../libs/db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../config/logger.js";

/**
 * Create a new job posting (Admin only)
 */
const createJob = asyncHandler(async (req, res) => {
  const { title, description, requirements, location, expiresAt } = req.validatedData;

  // Check if user is an admin and not super admin
  if (req.user.role !== "ADMIN" || req.user.isSuperAdmin) {
    throw new ApiError(
      403,
      "Only college admins can create job postings. Super admins cannot post jobs.",
    );
  }
  // Get the admin's college ID
  if (!req.user.admin || !req.user.admin.college) {
    throw new ApiError(400, "Admin is not associated with any college");
  }

  const collegeId = req.user.admin.college.id;

  // Check if this is the system college (additional protection)
  const college = await db.college.findUnique({
    where: { id: collegeId },
    select: { isSystemCollege: true },
  });

  if (college && college.isSystemCollege) {
    throw new ApiError(403, "Cannot create job postings for the system administration college");
  }

  // Create the job
  const job = await db.job.create({
    data: {
      title,
      description,
      requirements,
      location,
      expiresAt,
      collegeId,
    },
  });

  logger.info(
    `New job created: ${job.title} by admin ID ${req.user.id} for college ID ${collegeId}`,
  );

  return res.status(201).json(new ApiResponse(201, { job }, "Job created successfully"));
});

/**
 * Get all jobs
 * - Admin: Gets jobs from their college
 * - Student: Gets jobs from their college
 * - Super Admin: Cannot access jobs
 */
const getJobs = asyncHandler(async (req, res) => {
  let collegeId;

  // Super Admins cannot access jobs
  if (req.user.isSuperAdmin) {
    throw new ApiError(
      403,
      "Super admins cannot access job listings as they manage the system, not job postings",
    );
  }

  // Determine which college's jobs to fetch based on user role
  if (req.user.role === "ADMIN") {
    if (!req.user.admin || !req.user.admin.college) {
      throw new ApiError(400, "Admin is not associated with any college");
    }
    collegeId = req.user.admin.college.id;
  } else if (req.user.role === "STUDENT") {
    if (!req.user.student || !req.user.student.college) {
      throw new ApiError(400, "Student is not associated with any college");
    }
    collegeId = req.user.student.college.id;
  } else {
    throw new ApiError(403, "Unauthorized access");
  }

  // Get query parameters for filtering
  const { status, search } = req.query;

  // Build the where clause
  let where = {
    collegeId,
  };

  // Add status filter if provided
  if (status && ["ACTIVE", "CLOSED"].includes(status)) {
    where.status = status;
  }

  // Add search filter if provided
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }

  // Get jobs with college information
  const jobs = await db.job.findMany({
    where,
    include: {
      college: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: { applications: true },
      },
    },
    orderBy: [
      { status: "asc" }, // ACTIVE first, then CLOSED
      { createdAt: "desc" }, // Newest first
    ],
  });

  return res.status(200).json(new ApiResponse(200, { jobs }, "Jobs retrieved successfully"));
});

/**
 * Get job by ID
 * - Admin: Can view job if it belongs to their college
 * - Student: Can view job if it belongs to their college
 * - Super Admin: Cannot access job details
 */
const getJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Super Admins cannot access jobs
  if (req.user.isSuperAdmin) {
    throw new ApiError(
      403,
      "Super admins cannot access job details as they manage the system, not job postings",
    );
  }

  // Get job with college and application count
  const job = await db.job.findUnique({
    where: { id: parseInt(id) },
    include: {
      college: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: { applications: true },
      },
    },
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  // Check if user has access to this job based on college
  let userCollegeId;

  if (req.user.role === "ADMIN") {
    if (!req.user.admin || !req.user.admin.college) {
      throw new ApiError(400, "Admin is not associated with any college");
    }
    userCollegeId = req.user.admin.college.id;
  } else if (req.user.role === "STUDENT") {
    if (!req.user.student || !req.user.student.college) {
      throw new ApiError(400, "Student is not associated with any college");
    }
    userCollegeId = req.user.student.college.id;
  } else {
    throw new ApiError(403, "Unauthorized access");
  }

  // Check if job belongs to user's college
  if (job.collegeId !== userCollegeId) {
    throw new ApiError(403, "You do not have access to this job");
  }

  return res.status(200).json(new ApiResponse(200, { job }, "Job retrieved successfully"));
});

/**
 * Update job by ID (Admin only)
 */
const updateJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, requirements, location, expiresAt, status } = req.validatedData;

  // Check if user is an admin and not super admin
  if (req.user.role !== "ADMIN" || req.user.isSuperAdmin) {
    throw new ApiError(
      403,
      "Only college admins can update job postings. Super admins cannot modify jobs.",
    );
  }

  // Get the admin's college ID
  if (!req.user.admin || !req.user.admin.college) {
    throw new ApiError(400, "Admin is not associated with any college");
  }

  const adminCollegeId = req.user.admin.college.id;

  // Find the job
  const job = await db.job.findUnique({
    where: { id: parseInt(id) },
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  // Check if job belongs to admin's college
  if (job.collegeId !== adminCollegeId) {
    throw new ApiError(403, "You can only update jobs for your college");
  }

  // Update the job
  const updatedJob = await db.job.update({
    where: { id: parseInt(id) },
    data: {
      ...(title && { title }),
      ...(description && { description }),
      ...(requirements !== undefined && { requirements }),
      ...(location !== undefined && { location }),
      ...(expiresAt !== undefined && { expiresAt }),
      ...(status && { status }),
    },
  });

  logger.info(`Job updated: ${updatedJob.title} by admin ID ${req.user.id}`);

  return res
    .status(200)
    .json(new ApiResponse(200, { job: updatedJob }, "Job updated successfully"));
});

/**
 * Delete job by ID (Admin only)
 */
const deleteJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user is an admin
  if (req.user.role !== "ADMIN") {
    throw new ApiError(403, "Only college admins can delete job postings");
  }

  // Get the admin's college ID
  if (!req.user.admin || !req.user.admin.college) {
    throw new ApiError(400, "Admin is not associated with any college");
  }

  const adminCollegeId = req.user.admin.college.id;

  // Find the job
  const job = await db.job.findUnique({
    where: { id: parseInt(id) },
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  // Check if job belongs to admin's college
  if (job.collegeId !== adminCollegeId) {
    throw new ApiError(403, "You can only delete jobs for your college");
  }

  // Delete the job
  await db.job.delete({
    where: { id: parseInt(id) },
  });

  logger.info(`Job deleted: ID ${id} by admin ID ${req.user.id}`);

  return res.status(200).json(new ApiResponse(200, {}, "Job deleted successfully"));
});

/**
 * Apply to a job (Student only)
 */
const applyToJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { resumeUrl } = req.validatedData;

  // Check if user is a student
  if (req.user.role !== "STUDENT") {
    throw new ApiError(403, "Only students can apply to jobs");
  }

  // Get the student's information
  if (!req.user.student) {
    throw new ApiError(400, "User is not a student");
  }

  const studentId = req.user.student.id;
  const studentCollegeId = req.user.student.college.id;

  // Find the job
  const job = await db.job.findUnique({
    where: { id: parseInt(id) },
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  // Check if job is active
  if (job.status !== "ACTIVE") {
    throw new ApiError(400, "This job is no longer accepting applications");
  }

  // Check if job has expired
  if (job.expiresAt && job.expiresAt < new Date()) {
    throw new ApiError(400, "This job posting has expired");
  }

  // Check if job belongs to student's college
  if (job.collegeId !== studentCollegeId) {
    throw new ApiError(403, "You can only apply to jobs from your college");
  }

  // Check if student has already applied
  const existingApplication = await db.application.findUnique({
    where: {
      jobId_studentId: {
        jobId: parseInt(id),
        studentId,
      },
    },
  });

  if (existingApplication) {
    throw new ApiError(409, "You have already applied to this job");
  }

  // Create the application
  const application = await db.application.create({
    data: {
      jobId: parseInt(id),
      studentId,
      resumeUrl,
      status: "APPLIED",
    },
  });

  logger.info(`New application: Student ID ${studentId} applied to job ID ${id}`);

  return res
    .status(201)
    .json(new ApiResponse(201, { application }, "Application submitted successfully"));
});

/**
 * Get all applications for a job (Admin only)
 */
const getJobApplications = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user is an admin
  if (req.user.role !== "ADMIN") {
    throw new ApiError(403, "Only college admins can view job applications");
  }

  // Get the admin's college ID
  if (!req.user.admin || !req.user.admin.college) {
    throw new ApiError(400, "Admin is not associated with any college");
  }

  const adminCollegeId = req.user.admin.college.id;

  // Find the job
  const job = await db.job.findUnique({
    where: { id: parseInt(id) },
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  // Check if job belongs to admin's college
  if (job.collegeId !== adminCollegeId) {
    throw new ApiError(403, "You can only view applications for your college's jobs");
  }

  // Get applications with student information
  const applications = await db.application.findMany({
    where: { jobId: parseInt(id) },
    include: {
      student: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { appliedAt: "desc" },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { applications }, "Applications retrieved successfully"));
});

/**
 * Get student's applications (Student only)
 */
const getStudentApplications = asyncHandler(async (req, res) => {
  // Check if user is a student
  if (req.user.role !== "STUDENT") {
    throw new ApiError(403, "Only students can view their applications");
  }

  // Get the student's ID
  if (!req.user.student) {
    throw new ApiError(400, "User is not a student");
  }

  const studentId = req.user.student.id;

  // Get applications with job information
  const applications = await db.application.findMany({
    where: { studentId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          status: true,
          expiresAt: true,
          collegeId: true,
          college: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { appliedAt: "desc" },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { applications }, "Applications retrieved successfully"));
});

/**
 * Update application status (Admin only)
 */
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { jobId, applicationId } = req.params;
  const { status } = req.validatedData;

  // Check if user is an admin
  if (req.user.role !== "ADMIN") {
    throw new ApiError(403, "Only college admins can update application status");
  }

  // Get the admin's college ID
  if (!req.user.admin || !req.user.admin.college) {
    throw new ApiError(400, "Admin is not associated with any college");
  }

  const adminCollegeId = req.user.admin.college.id;

  // Find the job
  const job = await db.job.findUnique({
    where: { id: parseInt(jobId) },
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  // Check if job belongs to admin's college
  if (job.collegeId !== adminCollegeId) {
    throw new ApiError(403, "You can only update applications for your college's jobs");
  }

  // Find the application
  const application = await db.application.findUnique({
    where: { id: parseInt(applicationId) },
  });

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  // Check if application belongs to the job
  if (application.jobId !== parseInt(jobId)) {
    throw new ApiError(400, "Application does not belong to this job");
  }

  // Update the application status
  const updatedApplication = await db.application.update({
    where: { id: parseInt(applicationId) },
    data: { status },
  });

  logger.info(
    `Application status updated: ID ${applicationId} status changed to ${status} by admin ID ${req.user.id}`,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { application: updatedApplication },
        "Application status updated successfully",
      ),
    );
});

export {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  applyToJob,
  getJobApplications,
  getStudentApplications,
  updateApplicationStatus,
};
