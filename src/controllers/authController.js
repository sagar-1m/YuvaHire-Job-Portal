import bcrypt from "bcryptjs";
import db from "../libs/db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../config/logger.js";
import {
  generateAccessToken,
  generateRefreshToken,
  removeRefreshToken,
  generateEmailVerificationToken,
  verifyEmailToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from "../services/tokenService.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/emailService.js";

// Helper function for cookies
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};

// 1. Register a new user
const registerUser = asyncHandler(async (req, res) => {
  // Get validated data from the validation middleware
  const { name, email, collegeEmail, password, role, collegeId } = req.validatedData;

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // Check if college exists for STUDENT role
  if (role === "STUDENT" && collegeId) {
    const college = await db.college.findUnique({
      where: { id: collegeId },
      select: {
        id: true,
        status: true,
        allowedEmailDomain: true,
      },
    });

    if (!college) {
      throw new ApiError(400, "Invalid college ID");
    }

    // Check if college is active
    if (college.status !== "ACTIVE") {
      throw new ApiError(400, "The selected college is not active");
    }

    // If college has an allowed email domain and college email is provided, validate it
    if (college.allowedEmailDomain && collegeEmail) {
      // Check if college email ends with the allowed domain
      if (!collegeEmail.endsWith(college.allowedEmailDomain)) {
        throw new ApiError(400, `College email must end with ${college.allowedEmailDomain}`);
      }
    }
  } else if (role === "ADMIN") {
    // Direct admin registration is not allowed
    throw new ApiError(
      403,
      "Direct admin registration is not allowed. Please apply through the admin application process.",
    );
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate email verification token
  const { token: emailVerificationToken, expiresAt: emailVerificationTokenExpiry } =
    generateEmailVerificationToken();

  // Create user transaction
  const user = await db.$transaction(async (tx) => {
    // Create user
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role,
        emailVerificationToken,
        emailVerificationTokenExpiry,
        isVerified: false,
      },
    }); // If role is STUDENT, create student profile
    if (role === "STUDENT") {
      await tx.student.create({
        data: {
          userId: newUser.id,
          collegeId,
        },
      });
    }

    // If role is ADMIN, create admin profile
    if (role === "ADMIN") {
      await tx.admin.create({
        data: {
          userId: newUser.id,
          collegeId,
        },
      });
    }
    return newUser;
  });

  // Send verification email
  try {
    await sendVerificationEmail(user, emailVerificationToken);
  } catch (error) {
    logger.error(`Failed to send verification email to ${user.email}`, { error });
    // Rollback user creation if email sending fails
    await db.user.delete({
      where: { id: user.id },
    });
    throw new ApiError(500, "Failed to send verification email");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
        "User registered successfully. Please check your email to verify your account.",
      ),
    );
});

// 2. Login user and provide tokens
const loginUser = asyncHandler(async (req, res) => {
  // Get validated data from the validation middleware
  const { email, password } = req.validatedData;

  // Find user
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }
  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }
  // Check if email is verified
  if (!user.isVerified) {
    throw new ApiError(
      401,
      "Please verify your email before logging in. Check your inbox for a verification link.",
    );
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);

  // Set cookies
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRY_MS),
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      "Login successful",
    ),
  );
});

// 3. Refresh access token using refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
  // Get user and old refresh token from request
  const user = req.user;
  const oldRefreshToken = req.refreshToken;

  // Generate new access token
  const accessToken = generateAccessToken(user.id);

  // Optionally issue a new refresh token for enhanced security (token rotation)
  const newRefreshToken = await generateRefreshToken(user.id);

  // Remove the old refresh token (token rotation)
  await removeRefreshToken(oldRefreshToken);

  // Set the new refresh token in a cookie
  res.cookie("refreshToken", newRefreshToken, {
    ...cookieOptions,
    maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRY_MS),
  });

  return res.status(200).json(new ApiResponse(200, { accessToken }, "Access token refreshed"));
});

// 4. Logout user and clear refresh token
const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    // Remove token from database
    await removeRefreshToken(refreshToken);
  }

  // Clear cookie
  res.clearCookie("refreshToken", cookieOptions);

  return res.status(200).json(new ApiResponse(200, {}, "Logged out successfully"));
});

// 5. Email verification
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.validatedData;

  // Find user with this token
  const user = await verifyEmailToken(token);

  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  if (user.isVerified) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Email is already verified. You can now log in."));
  }

  // Update user to mark email as verified
  await db.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email verified successfully. You can now log in."));
});

// 6. Resend verification email
const resendVerificationEmail = asyncHandler(async (req, res) => {
  // Get validated email from validation middleware
  const { email } = req.validatedData;

  // Find user by email
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    // For security reasons, don't reveal if email exists or not
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "If your email exists in our system, a verification email has been sent.",
        ),
      );
  }

  // If already verified, no need to resend
  if (user.isVerified) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Email is already verified. You can log in."));
  }

  // Generate new verification token
  const { token: emailVerificationToken, expiresAt: emailVerificationTokenExpiry } =
    generateEmailVerificationToken();

  // Update user with new token
  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken,
      emailVerificationTokenExpiry,
    },
  });

  // Send verification email
  try {
    await sendVerificationEmail(user, emailVerificationToken);
  } catch (error) {
    logger.error(`Failed to send verification email to ${user.email}`, { error });
    throw new ApiError(500, "Failed to send verification email");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Verification email has been sent. Please check your inbox."));
});

// 7. Request password reset
const requestPasswordReset = asyncHandler(async (req, res) => {
  // Get validated email from validation middleware
  const { email } = req.validatedData;

  // Find user by email
  const user = await db.user.findUnique({
    where: { email },
  });

  // For security reasons, don't reveal if email exists or not
  if (!user) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "If your email exists in our system, a password reset link has been sent.",
        ),
      );
  }

  // Generate password reset token
  const { token, expiresAt } = generatePasswordResetToken();

  // Update user with reset token
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetTokenExpiry: expiresAt,
    },
  });

  // Send password reset email
  try {
    await sendPasswordResetEmail(user, token);
  } catch (error) {
    logger.error(`Failed to send password reset email to ${user.email}`, { error });
    throw new ApiError(500, "Failed to send password reset email");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "If your email exists in our system, a password reset link has been sent.",
      ),
    );
});

// 8. Reset password using token
const resetPassword = asyncHandler(async (req, res) => {
  // Get validated data from validation middleware
  const { token, password } = req.validatedData;

  // Find user with this token
  const user = await verifyPasswordResetToken(token);

  if (!user) {
    throw new ApiError(400, "Invalid or expired password reset token");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Update user with new password and clear reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      },
    });

    // Clear any existing refresh tokens for security
    await db.token.deleteMany({
      where: { userId: user.id },
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "Password has been reset successfully. You can now log in with your new password.",
        ),
      );
  } catch (error) {
    logger.error(`Password reset failed for user ${user.id}: ${error.message}`, { error });
    throw new ApiError(500, "Failed to reset password. Please try again later.");
  }
});

// 9. Get current user information
const getCurrentUser = asyncHandler(async (req, res) => {
  // User is already attached to req by the authenticate middleware
  const user = req.user;

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Current user information retrieved successfully"));
});

export {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  getCurrentUser,
};
