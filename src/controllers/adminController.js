import bcrypt from "bcryptjs";
import crypto from "crypto";
import db from "../libs/db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../config/logger.js";
import { sendInvitationEmail } from "../services/emailService.js";
import { generateEmailVerificationToken } from "../services/tokenService.js";

/**
 * Create a new admin account (only by super admin)
 * This sends an invitation email with a temporary password
 */
const createAdmin = asyncHandler(async (req, res) => {
  // Get validated data from middleware
  const { name, email, collegeId } = req.validatedData;

  // Check if user is a super admin
  if (req.user.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Only super administrators can create admin accounts");
  }

  // Check if user with email already exists
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // Check if college exists
  const college = await db.college.findUnique({
    where: { id: collegeId },
  });

  if (!college) {
    throw new ApiError(400, "Invalid college ID");
  }

  // Generate a temporary password
  const tempPassword = crypto.randomBytes(8).toString("hex");

  // Hash the temporary password
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  // Generate email verification token
  const { token: emailVerificationToken, expiresAt: emailVerificationTokenExpiry } =
    generateEmailVerificationToken();

  // Create user and admin profile in transaction
  const user = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: "ADMIN",
        emailVerificationToken,
        emailVerificationTokenExpiry,
        isVerified: false,
      },
    });

    // Create admin profile
    await tx.admin.create({
      data: {
        userId: newUser.id,
        collegeId,
      },
    });

    return newUser;
  });

  // Send invitation email with temporary password
  try {
    await sendInvitationEmail(user, emailVerificationToken, tempPassword, college.name);
  } catch (error) {
    logger.error(`Failed to send invitation email to ${user.email}`, { error });
    // Rollback user creation if email sending fails
    await db.user.delete({
      where: { id: user.id },
    });
    throw new ApiError(500, "Failed to send invitation email");
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        admin: {
          id: user.id,
          name: user.name,
          email: user.email,
          college: { id: college.id, name: college.name },
        },
      },
      "Admin invitation sent successfully",
    ),
  );
});

/**
 * Get a list of admins with their college information
 * Only accessible to super admins
 */
const getAdmins = asyncHandler(async (req, res) => {
  // Check if user is a super admin
  if (req.user.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Only super administrators can view all admin accounts");
  }

  const admins = await db.admin.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          isVerified: true,
        },
      },
      college: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.status(200).json(new ApiResponse(200, { admins }, "Admins retrieved successfully"));
});

export { createAdmin, getAdmins };
