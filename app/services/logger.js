import winston from "winston";
import path from "path";

// Define custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}${
      stack ? "\n" + stack : ""
    }`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [
    // Write all logs to merimen.log
    new winston.transports.File({
      filename: path.join("logs", "merimen.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Write errors to merimen-error.log
    new winston.transports.File({
      filename: path.join("logs", "merimen-error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console logging in development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    })
  );
}

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join("logs", "uncaught-exceptions.log"),
  })
);

export default logger;
