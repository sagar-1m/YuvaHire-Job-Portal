import { z } from "zod";

// Schema for admin application
const adminApplicationSchema = z.object({
  adminName: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(50, { message: "Name must be at most 50 characters long" })
    .trim(),

  adminEmail: z.string().email({ message: "Invalid email address" }).toLowerCase().trim(),

  adminPassword: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(128, { message: "Password must be at most 128 characters long" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
      message:
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    }),

  collegeName: z
    .string()
    .min(2, { message: "College name must be at least 2 characters long" })
    .max(100, { message: "College name must be at most 100 characters long" })
    .trim(),

  collegeLocation: z
    .string()
    .min(2, { message: "College location must be at least 2 characters long" })
    .max(100, { message: "College location must be at most 100 characters long" })
    .trim(),

  collegeWebsite: z.string().url({ message: "Please provide a valid website URL" }).optional(),

  allowedEmailDomain: z
    .string()
    .regex(/^@[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*$/, {
      message: "Please provide a valid email domain (e.g., @example.edu)",
    })
    .optional(),

  adminPosition: z
    .string()
    .min(2, { message: "Position must be at least 2 characters long" })
    .max(100, { message: "Position must be at most 100 characters long" })
    .trim(),

  verificationDocumentUrl: z
    .string()
    .url({ message: "Please provide a valid document URL" })
    .optional(),
});

// Schema for admin application review
const reviewApplicationSchema = z.object({
  applicationId: z
    .union([
      z.string().refine((val) => !isNaN(parseInt(val)), {
        message: "Application ID must be a valid number",
      }),
      z.number(),
    ])
    .transform((val) => (typeof val === "string" ? parseInt(val) : val)),

  decision: z.enum(["APPROVE", "REJECT"], {
    errorMap: () => ({ message: "Decision must be either APPROVE or REJECT" }),
  }),

  comments: z
    .string()
    .max(500, { message: "Comments must be at most 500 characters long" })
    .optional(),
});

// Schema for listing colleges with pagination and filtering
const listCollegesSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),

  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10)),

  status: z.enum(["ACTIVE", "PENDING", "REJECTED"]).optional(),

  search: z.string().optional(),
});

export { adminApplicationSchema, reviewApplicationSchema, listCollegesSchema };
