import { z } from "zod";

// Schema for user registration
const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Name must be at least 2 characters long" })
      .max(50, { message: "Name must be at most 50 characters long" })
      .trim(),
    email: z.string().email({ message: "Invalid email address" }).toLowerCase().trim(),

    collegeEmail: z
      .string()
      .email({ message: "Invalid college email address" })
      .toLowerCase()
      .trim()
      .optional(),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long" })
      .max(128, { message: "Password must be at most 128 characters long" })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      }),
    role: z.enum(["STUDENT"], {
      errorMap: () => ({ message: "Only student registration is allowed" }),
    }),

    collegeId: z
      .union([
        z.string().refine(
          (val) => {
            if (val === undefined) return true;
            return !isNaN(parseInt(val));
          },
          { message: "College ID must be a valid number" },
        ),
        z.number(),
      ])
      .optional()
      .transform((val) => (val ? (typeof val === "string" ? parseInt(val) : val) : undefined)),
  })
  .refine(
    (data) => {
      // For students, collegeId is required
      return !(data.role === "STUDENT" && !data.collegeId);
    },
    {
      message: "College ID is required for student registration",
      path: ["collegeId"],
    },
  );

// Schema for user login
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }).toLowerCase().trim(),
  password: z.string().min(1, { message: "Password is required" }),
});

// Schema for email verification token
const verifyEmailSchema = z.object({
  token: z.string().min(1, { message: "Verification token is required" }),
});

// Schema for resending verification email
const resendVerificationSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }).toLowerCase().trim(),
});

// Schema for refresh token
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, { message: "Refresh token is required" }).optional(), // Optional because it might be in cookies
});

// Schema for password reset request
const passwordResetRequestSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }).toLowerCase().trim(),
});

// Schema for password reset confirmation
const passwordResetSchema = z
  .object({
    token: z.string().min(1, { message: "Reset token is required" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long" })
      .max(128, { message: "Password must be at most 128 characters long" })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      }),
    confirmPassword: z.string().min(1, { message: "Confirm password is required" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  refreshTokenSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
};
