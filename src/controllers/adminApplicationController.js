import db from "../libs/db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../config/logger.js";
import { generateEmailVerificationToken, hashPassword } from "../services/tokenService.js";
import {
  sendVerificationEmail,
  notifySuperAdmin,
  sendAdminApprovalEmail,
  sendAdminRejectionEmail,
} from "../services/emailService.js";

/**
 * Apply to become a college admin
 * Creates a pending admin application with college details
 */
const applyForAdminRole = asyncHandler(async (req, res) => {
  const {
    adminName,
    adminEmail,
    adminPassword,
    collegeName,
    collegeLocation,
    collegeWebsite,
    allowedEmailDomain,
    adminPosition,
    verificationDocumentUrl,
  } = req.validatedData;

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // Check if college with same name already exists
  const existingCollege = await db.college.findFirst({
    where: {
      name: {
        equals: collegeName,
        mode: "insensitive",
      },
    },
  });

  if (existingCollege) {
    throw new ApiError(409, "A college with this name already exists");
  }

  // Hash password
  const hashedPassword = await hashPassword(adminPassword);

  // Generate email verification token
  const { token: emailVerificationToken, expiresAt: emailVerificationTokenExpiry } =
    generateEmailVerificationToken();

  // Create pending admin and college in transaction
  const result = await db.$transaction(async (tx) => {
    // Create college with PENDING status
    const college = await tx.college.create({
      data: {
        name: collegeName,
        location: collegeLocation,
        website: collegeWebsite,
        allowedEmailDomain,
        status: "PENDING",
      },
    });

    // Create user with PENDING_ADMIN role
    const user = await tx.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash: hashedPassword,
        role: "PENDING_ADMIN",
        emailVerificationToken,
        emailVerificationTokenExpiry,
        isVerified: false,
      },
    });

    // Create admin application
    const adminApplication = await tx.adminApplication.create({
      data: {
        userId: user.id,
        collegeId: college.id,
        position: adminPosition,
        verificationDocumentUrl,
        status: "PENDING",
      },
    });

    return { user, college, adminApplication };
  });

  // Send verification email
  try {
    await sendVerificationEmail(result.user, emailVerificationToken);
  } catch (error) {
    logger.error(`Failed to send verification email to ${result.user.email}`, { error });
    // We should rollback the transaction, but since it's already committed,
    // we need to manually delete the created records
    await db.$transaction([
      db.adminApplication.delete({ where: { id: result.adminApplication.id } }),
      db.user.delete({ where: { id: result.user.id } }),
      db.college.delete({ where: { id: result.college.id } }),
    ]);
    throw new ApiError(500, "Failed to send verification email");
  }

  // Notify super admin
  try {
    // Find super admin(s)
    const superAdmins = await db.user.findMany({
      where: { role: "SUPER_ADMIN" },
    });

    if (superAdmins.length > 0) {
      await Promise.all(
        superAdmins.map((admin) =>
          notifySuperAdmin(admin, result.user, result.college, result.adminApplication),
        ),
      );
    }
  } catch (error) {
    logger.error("Failed to notify super admin of new application", { error });
    // Continue execution, this shouldn't break the application process
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        message: "Admin application submitted successfully",
        applicationId: result.adminApplication.id,
      },
      "Your application to register as a college admin has been submitted and is pending review. Please check your email to verify your account.",
    ),
  );
});

/**
 * List all pending admin applications (Super Admin only)
 */
const listAdminApplications = asyncHandler(async (req, res) => {
  // Verify super admin status
  if (req.user.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Only super admins can view admin applications");
  }

  const { status } = req.query;

  // Build query
  const where = {};
  if (status) {
    where.status = status;
  }

  // Get applications with user and college details
  const applications = await db.adminApplication.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isVerified: true,
        },
      },
      college: {
        select: {
          id: true,
          name: true,
          location: true,
          website: true,
          status: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { applications }, "Admin applications retrieved successfully"));
});

/**
 * Get admin application details (Super Admin only)
 */
const getAdminApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify super admin status
  if (req.user.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Only super admins can view admin applications");
  }

  // Find application
  const application = await db.adminApplication.findUnique({
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
          website: true,
          allowedEmailDomain: true,
          status: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!application) {
    throw new ApiError(404, "Admin application not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { application }, "Admin application retrieved successfully"));
});

/**
 * Approve or reject pending admin application (Super Admin only)
 */
const reviewAdminApplication = asyncHandler(async (req, res) => {
  const { applicationId, decision, comments } = req.validatedData;

  // Verify super admin status
  if (req.user.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Only super admins can review admin applications");
  }

  // Find application
  const application = await db.adminApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: true,
      college: true,
    },
  });

  if (!application) {
    throw new ApiError(404, "Admin application not found");
  }

  if (application.status !== "PENDING") {
    throw new ApiError(400, "This application has already been processed");
  }

  // Process approval or rejection
  if (decision === "APPROVE") {
    // Approve in transaction
    await db.$transaction(async (tx) => {
      // Update college status
      await tx.college.update({
        where: { id: application.collegeId },
        data: { status: "ACTIVE" },
      });

      // Update user role
      await tx.user.update({
        where: { id: application.userId },
        data: { role: "ADMIN" },
      }); // Create admin record
      await tx.admin.create({
        data: {
          userId: application.userId,
          collegeId: application.collegeId,
          description:
            "College Administrator - Manages college job postings and student applications",
        },
      });

      // Update application status
      await tx.adminApplication.update({
        where: { id: applicationId },
        data: {
          status: "APPROVED",
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          reviewComments: comments,
        },
      });
    });

    // Notify the approved admin
    try {
      await sendAdminApprovalEmail(application.user.email, application.college.name);
    } catch (error) {
      logger.error(`Failed to send approval email to ${application.user.email}`, { error });
      // Continue execution, this shouldn't break the application process
    }

    logger.info(`Admin application approved: ${applicationId} by ${req.user.id}`);

    return res
      .status(200)
      .json(new ApiResponse(200, { applicationId }, "Admin application approved successfully"));
  } else if (decision === "REJECT") {
    // Handle rejection
    await db.$transaction(async (tx) => {
      // Update application status
      await tx.adminApplication.update({
        where: { id: applicationId },
        data: {
          status: "REJECTED",
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          reviewComments: comments,
        },
      });

      // Set college to rejected
      await tx.college.update({
        where: { id: application.collegeId },
        data: { status: "REJECTED" },
      });
    });

    // Notify the rejected applicant
    try {
      await sendAdminRejectionEmail(application.user.email, comments);
    } catch (error) {
      logger.error(`Failed to send rejection email to ${application.user.email}`, { error });
      // Continue execution, this shouldn't break the application process
    }

    logger.info(`Admin application rejected: ${applicationId} by ${req.user.id}`);

    return res
      .status(200)
      .json(new ApiResponse(200, { applicationId }, "Admin application rejected successfully"));
  } else {
    throw new ApiError(400, "Invalid decision. Must be APPROVE or REJECT");
  }
});

/**
 * List all active colleges (for student registration)
 */
const listActiveColleges = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;

  // Build where clause
  const where = {
    status: "ACTIVE",
  };

  // Add search if provided
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }

  // Get colleges with pagination
  const skip = (page - 1) * limit;
  const colleges = await db.college.findMany({
    where,
    select: {
      id: true,
      name: true,
      location: true,
      website: true,
      allowedEmailDomain: true,
      _count: {
        select: {
          students: true,
          jobs: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
    skip,
    take: parseInt(limit),
  });

  // Get total count for pagination
  const totalColleges = await db.college.count({ where });
  const totalPages = Math.ceil(totalColleges / limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        colleges,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: totalColleges,
          totalPages,
        },
      },
      "Active colleges retrieved successfully",
    ),
  );
});

export {
  applyForAdminRole,
  listAdminApplications,
  getAdminApplication,
  reviewAdminApplication,
  listActiveColleges,
};
