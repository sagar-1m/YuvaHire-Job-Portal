import express from "express";
import { initialSetup } from "../controllers/setupController.js";
import validate from "../middleware/validationMiddleware.js";
import { initialSetupSchema } from "../validations/setupValidations.js";

const router = express.Router();

router.post("/init", validate(initialSetupSchema), initialSetup);

export default router;
