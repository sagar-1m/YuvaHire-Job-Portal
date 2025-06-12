import ApiError from "./ApiError.js";

/**
 * Utility function to check if a user has access to a specific college's resources
 */
const checkCollegeAccess = (user, collegeId, allowSystemAdmin = false) => {
  // Check if user exists
  if (!user) {
    throw new ApiError(401, "Authentication required");
  }

  // Super admin handling
  if (user.isSuperAdmin) {
    // If this is a super admin and we're not allowing system admin access, deny access
    if (!allowSystemAdmin) {
      throw new ApiError(
        403,
        "Super admins cannot access college-specific resources. This role is for system administration only.",
      );
    }

    // If we are allowing system admin access, make sure they're accessing it for system purposes
    return true;
  }

  // For college admins
  if (user.role === "ADMIN") {
    if (!user.admin || !user.admin.college) {
      throw new ApiError(400, "Admin is not associated with any college");
    }

    // Check if the college ID matches
    if (user.admin.college.id !== collegeId) {
      throw new ApiError(403, "You can only access resources for your own college");
    }

    return true;
  }

  // For students
  if (user.role === "STUDENT") {
    if (!user.student || !user.student.college) {
      throw new ApiError(400, "Student is not associated with any college");
    }

    // Check if the college ID matches
    if (user.student.college.id !== collegeId) {
      throw new ApiError(403, "You can only access resources for your own college");
    }

    return true;
  }

  // If we get here, the user doesn't have a recognized role with college access
  throw new ApiError(403, "You don't have permission to access this resource");
};

export { checkCollegeAccess };
