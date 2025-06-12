import db from "../libs/db.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";

/**
 * Get a list of all colleges
 * This endpoint is public and used for registration
 */
const getColleges = asyncHandler(async (req, res) => {
  const colleges = await db.college.findMany({
    select: {
      id: true,
      name: true,
      address: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { colleges }, "Colleges retrieved successfully"));
});

/**
 * Get details of a specific college
 */
const getCollegeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const college = await db.college.findUnique({
    where: { id: parseInt(id) },
    include: {
      _count: {
        select: {
          students: true,
          jobs: true,
        },
      },
    },
  });

  if (!college) {
    throw new ApiError(404, "College not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { college }, "College details retrieved successfully"));
});

/**
 * Update a college (Admin only)
 */
const updateCollege = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const collegeId = parseInt(id);

  // Get the validated data
  const { name, location, website, address, allowedEmailDomain } = req.validatedData;

  // Check if the user is an admin
  if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Only admins can update colleges");
  }

  // For college admins, make sure they can only update their own college
  if (req.user.role === "ADMIN") {
    // Get the admin's college
    const admin = await db.admin.findUnique({
      where: { userId: req.user.id },
      select: { collegeId: true },
    });

    if (!admin || admin.collegeId !== collegeId) {
      throw new ApiError(403, "You can only update your own college");
    }
  }

  // Check if college exists
  const existingCollege = await db.college.findUnique({
    where: { id: collegeId },
  });

  if (!existingCollege) {
    throw new ApiError(404, "College not found");
  }

  // Prepare update data
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (location !== undefined) updateData.location = location;
  if (website !== undefined) updateData.website = website;
  if (address !== undefined) updateData.address = address;
  if (allowedEmailDomain !== undefined) updateData.allowedEmailDomain = allowedEmailDomain;

  // Update the college
  const updatedCollege = await db.college.update({
    where: { id: collegeId },
    data: updateData,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, { college: updatedCollege }, "College updated successfully"));
});

export { getColleges, getCollegeById, updateCollege };
