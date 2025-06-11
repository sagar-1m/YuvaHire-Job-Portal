import winston from "winston";
import path from "path";
import fs from "fs";

// Create logs directory if it doesn't exist
const logDir = "logs";
if (process.env.NODE_ENV === "production") {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
}

// Define custom log levels with 'http' included
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3, // Added http level
  debug: 4,
};

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format with colors for development
const devFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  }),
);

// JSON log format for production
const prodFormat = combine(timestamp(), errors({ stack: true }), winston.format.json());

const transports = [
  new winston.transports.Console({
    format: process.env.NODE_ENV === "production" ? prodFormat : devFormat,
  }),
];

// In production, log to a file
if (process.env.NODE_ENV === "production") {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "app.log"),
      format: prodFormat,
      maxsize: 1048576, // 1MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: prodFormat,
      maxsize: 1048576, // 1MB
      maxFiles: 5,
    }),
  );
}

// Create the logger instance
const logger = winston.createLogger({
  levels: levels,
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  defaultMeta: { service: "yuvahire-api" },
  transports,
  // Add exception handling
  exceptionHandlers: [new winston.transports.Console({ format: devFormat })],
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Add colors for custom levels
winston.addColors({
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta", // Color for HTTP logs
  debug: "blue",
});

// Morgan integration for HTTP request logging
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

export default logger;
