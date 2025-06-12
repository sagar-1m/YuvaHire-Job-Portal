import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  verifyAccessToken,
  verifyRefreshToken,
  generateRefreshToken,
  removeRefreshToken,
} from "../services/tokenService.js";
import db from "../libs/db.js";

// Cookie options for consistent settings
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};

/**
 * Middleware to authenticate user using JWT access token
 */
const authenticate = asyncHandler(async (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Access token is required. Please login.");
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify token
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      throw new ApiError(401, "Invalid or expired token");
    }

    // Find user with role-specific information
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        student: {
          include: {
            college: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        admin: {
          include: {
            college: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(401, "User not found");
    } // Add user to request object with role-specific data
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isSuperAdmin: user.role === "SUPER_ADMIN", // Flag to easily identify super admin
      // The super admin's role is to manage the system and approve college admins,
    };

    // Add student-specific data if applicable
    if (user.role === "STUDENT" && user.student) {
      req.user.student = {
        id: user.student.id,
        college: user.student.college,
      };
    }

    // Add admin-specific data if applicable
    if (user.role === "ADMIN" && user.admin) {
      req.user.admin = {
        id: user.admin.id,
        college: user.admin.college,
      };
    }
    // For SUPER_ADMIN, add admin data but mark it differently
    if (user.role === "SUPER_ADMIN" && user.admin) {
      req.user.admin = {
        id: user.admin.id,
        college: user.admin.college,
        isSystemAdmin: true, // Flag to indicate this is a system-level admin who manages the platform, not job postings
      };
    }

    next();
  } catch (error) {
    // Clear any refresh token cookies on access token error
    res.clearCookie("refreshToken", cookieOptions);
    throw new ApiError(401, "Authentication failed: " + (error.message || "Invalid token"));
  }
});

/**
 * Middleware to authenticate and rotate refresh token
 * Used specifically for the refresh token endpoint
 */
const authenticateRefreshToken = asyncHandler(async (req, res, next) => {
  // Get refresh token from cookie or request body
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  try {
    // Verify refresh token
    const decoded = await verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    // Find user
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new ApiError(401, "User not found");
    }

    // Store user in request for the next middleware
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    // Store the original refresh token for later removal
    req.refreshToken = refreshToken;

    next();
  } catch (error) {
    // Clear cookie on error
    res.clearCookie("refreshToken", cookieOptions);
    throw new ApiError(401, "Authentication failed: " + (error.message || "Invalid refresh token"));
  }
});

/**
 * Middleware to authorize user based on roles
 */
const authorize = (roles = []) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    if (roles.length && !roles.includes(req.user.role)) {
      throw new ApiError(403, "You don't have permission to access this resource");
    }

    next();
  });
};

/**
 * Middleware to require super admin role
 */
const requireSuperAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  if (req.user.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Super Admin access required for system administration tasks");
  }

  next();
});

// Alias for authenticate to make it clearer in routes
const authenticateJWT = authenticate;

export {
  authenticate,
  authenticateJWT,
  authenticateRefreshToken,
  authorize,
  requireSuperAdmin,
  cookieOptions,
};
