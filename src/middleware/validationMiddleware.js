import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Middleware that validates request data against a provided Zod schema
 * @param {Object} schema - Zod schema to validate against
 * @param {String} source - Source of data to validate (body, params, query)
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = "body") => {
  return asyncHandler(async (req, res, next) => {
    try {
      // Get the data from the specified source
      const data = req[source];

      // Validate the data against the schema
      const result = schema.safeParse(data);

      if (!result.success) {
        // If validation fails, throw an error
        throw new ApiError(400, "Validation error", result.error.errors);
      }

      // Add validated data to the request object
      req.validatedData = result.data;

      // Continue to the next middleware/controller
      next();
    } catch (error) {
      // If it's already an ApiError instance, pass it through
      if (error instanceof ApiError) {
        throw error;
      }

      // Otherwise, create a new ApiError
      throw new ApiError(400, "Validation error", error.message);
    }
  });
};

export default validate;
