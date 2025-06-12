import db from "../libs/db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../config/logger.js";
import { hashPassword } from "../services/tokenService.js";

/**
 * One-time setup endpoint to create the first college and admin
 * This endpoint can only be accessed when no colleges or admins exist in the system
 */
const initialSetup = asyncHandler(async (req, res) => {
  const { adminName, adminEmail, adminPassword } = req.validatedData;

  // Check if any colleges or admins already exist
  const collegeCount = await db.college.count();
  const adminCount = await db.admin.count();

  if (collegeCount > 0 || adminCount > 0) {
    throw new ApiError(400, "Setup has already been completed. System is already initialized.");
  } // Start a transaction to ensure system setup is atomic
  const result = await db.$transaction(async (prisma) => {
    // Create a system college for the super admin
    // This is different from a regular college - it represents the system itself
    // and is not meant for posting jobs or managing students
    const systemCollege = await prisma.college.create({
      data: {
        name: "YuvaHire System Administration",
        location: "System Administration",
        status: "ACTIVE", // Set college to active during initial setup
        website: process.env.FRONTEND_URL || "http://localhost:3000",
        allowedEmailDomain: null, // System college doesn't have students
        isSystemCollege: true, // Flag to identify this as the system college
      },
    });

    // Hash the password
    const hashedPassword = await hashPassword(adminPassword);

    // Create the user with SUPER_ADMIN role
    // Super admin's role is to manage the system and approve college admins,
    // not to post jobs or manage students
    const user = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash: hashedPassword,
        role: "SUPER_ADMIN",
        isVerified: true, // Super admin is automatically verified
      },
    }); // Create the admin and associate with the system college
    const admin = await prisma.admin.create({
      data: {
        userId: user.id,
        collegeId: systemCollege.id, // Associate with system college, not the user college
        description:
          "System Administrator - Manages the platform and verifies college admins. Cannot post jobs or manage students.",
      },
    });

    return { systemCollege, user, admin };
  });
  logger.info(
    `Initial setup completed: System admin "${result.user.name}" (${result.user.email}) created with system administration college`,
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        message: "System initialized successfully",
        superAdmin: {
          name: result.user.name,
          email: result.user.email,
          role: "SUPER_ADMIN",
        },
        systemCollege: {
          id: result.systemCollege.id,
          name: result.systemCollege.name,
          status: "ACTIVE",
        },
      },
      "Initial setup completed successfully. Super admin created for system administration.",
    ),
  );
});

export { initialSetup };
