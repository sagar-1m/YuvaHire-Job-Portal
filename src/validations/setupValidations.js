import { z } from "zod";

// Initial setup validation schema
const initialSetupSchema = z.object({
  adminName: z
    .string()
    .min(2, "Admin name must be at least 2 characters")
    .max(50, "Admin name must be less than 50 characters"),
  adminEmail: z
    .string()
    .email("Please provide a valid email address")
    .max(100, "Email must be less than 100 characters"),
  adminPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),
});

export { initialSetupSchema };
