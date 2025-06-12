import { z } from "zod";

/**
 * Schema for creating an admin account (only by super admin)
 */
const createAdminSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(50, { message: "Name must be at most 50 characters long" })
    .trim(),

  email: z.string().email({ message: "Invalid email address" }).toLowerCase().trim(),

  collegeId: z
    .number()
    .int({ message: "College ID must be an integer" })
    .positive({ message: "College ID must be a positive number" }),
});

export { createAdminSchema };
