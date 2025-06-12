import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import logger from "./config/logger.js";
import ApiError from "./utils/ApiError.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import collegeRoutes from "./routes/collegeRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import setupRoutes from "./routes/setupRoutes.js";
import adminApplicationRoutes from "./routes/adminApplicationRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";

const app = express();

// Middleware
app.use(helmet()); // Secure HTTP headers

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
); // Enable CORS

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Use morgan with winston logger for HTTP request logging
app.use(
  morgan("tiny", {
    stream: logger.stream,
  }),
);

// Base route - starting with /
app.get("/", (req, res) => {
  logger.info("Base route accessed");
  res.status(200).json({
    status: "success",
    message: "Welcome to the YuvaHire Job Portal API",
    documetation: "/api/docs",
    version: "1.0.0",
  });
});

// Mount routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/colleges", collegeRoutes);
app.use("/api/v1/admins", adminRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/setup", setupRoutes);
app.use("/api/v1/admin-applications", adminApplicationRoutes);
app.use("/api/v1/students", studentRoutes);

// Catch-all route for undefined routes
app.all("*", (req, res, next) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);

  const err = new ApiError(404, `Cannot ${req.method} ${req.originalUrl}`, [
    `Route ${req.originalUrl} not found`,
  ]);
  next(err);
});

// Global error handler
app.use((err, req, res, next) => {
  // If error isn't an ApiError instance, convert it
  if (!(err instanceof ApiError)) {
    const statusCode = err.statusCode || 500;
    err = new ApiError(statusCode, err.message || "Internal Server Error");
  }

  // Log the error with contextual information
  logger.error(`${err.statusCode} - ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // Send structured response
  res.status(err.statusCode).json({
    success: false,
    status: err.statusCode < 500 ? "fail" : "error",
    message: err.message,
    ...(err.errors.length > 0 && { errors: err.errors }),
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

export default app;
