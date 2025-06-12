import { z } from "zod";

// Schema for creating a job
const createJobSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Job title must be at least 3 characters long" })
    .max(100, { message: "Job title must be at most 100 characters long" })
    .trim(),

  description: z
    .string()
    .min(10, { message: "Job description must be at least 10 characters long" })
    .max(2000, { message: "Job description must be at most 2000 characters long" })
    .trim(),

  requirements: z
    .string()
    .max(2000, { message: "Requirements must be at most 2000 characters long" })
    .optional()
    .transform((val) => val || undefined),

  location: z
    .string()
    .max(100, { message: "Location must be at most 100 characters long" })
    .optional()
    .transform((val) => val || undefined),

  expiresAt: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime()) && date > new Date();
      },
      { message: "Expiry date must be a valid future date" },
    )
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

// Schema for updating a job
const updateJobSchema = createJobSchema.partial().extend({
  status: z.enum(["ACTIVE", "CLOSED"]).optional(),
});

// Schema for applying to a job
const applyToJobSchema = z.object({
  resumeUrl: z.string().url({ message: "Resume URL must be a valid URL" }).optional(),
});

export { createJobSchema, updateJobSchema, applyToJobSchema };
