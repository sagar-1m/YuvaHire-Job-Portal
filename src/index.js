import dotenv from "dotenv";

import app from "./app.js";
import db from "./libs/db.js";
import logger from "./config/logger.js";

// Load environment variables from .env file
dotenv.config({
  path: "./.env",
});

// Set the port
const PORT = process.env.PORT || 5000;

// Basic error handling for uncaught errors
process.on("uncaughtException", (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}`, {
    stack: err.stack,
    name: err.name,
  });
  process.exit(1);
});

// Start the server
const startServer = async () => {
  try {
    // Connect to the database
    await db.$queryRaw`SELECT 1 AS health_check`; // Simple query to check database connection
    logger.info("Database connected successfully");

    // Start the Express server
    const server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    // Monitor db connection errors
    const interval = setInterval(async () => {
      try {
        await db.$queryRaw`SELECT 1`;
      } catch (error) {
        logger.error("Database connection lost. Shutting down server...");
        clearInterval(interval);
        server.close(() => {
          logger.info("Server shut down due to database connection loss");
          process.exit(1);
        });
      }
    }, 10000); // Check every 10 seconds
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1); // Exit the process if there's an error
  }
};

startServer();
