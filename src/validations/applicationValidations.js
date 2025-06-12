import { z } from "zod";

// Schema for updating application status
const updateApplicationStatusSchema = z.object({
  status: z.enum(["APPLIED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"], {
    errorMap: () => ({
      message: "Status must be one of: APPLIED, UNDER_REVIEW, ACCEPTED, REJECTED",
    }),
  }),
});

export { updateApplicationStatusSchema };
