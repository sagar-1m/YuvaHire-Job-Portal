import { z } from "zod";

// Schema for updating a college
const updateCollegeSchema = z.object({
  name: z
    .string()
    .min(2, { message: "College name must be at least 2 characters long" })
    .max(100, { message: "College name must be at most 100 characters long" })
    .trim()
    .optional(),

  location: z
    .string()
    .max(100, { message: "Location must be at most 100 characters long" })
    .optional()
    .transform((val) => val || undefined),

  website: z
    .string()
    .url({ message: "Website must be a valid URL" })
    .optional()
    .transform((val) => val || undefined),

  address: z
    .string()
    .max(200, { message: "Address must be at most 200 characters long" })
    .optional()
    .transform((val) => val || undefined),

  allowedEmailDomain: z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/, {
      message: "Allowed email domain must be a valid domain (e.g., college.edu)",
    })
    .optional()
    .transform((val) => val || undefined),
});

export { updateCollegeSchema };
