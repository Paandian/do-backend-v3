const { createLogger, format, transports } = require("winston");
const moment = require("moment");
const path = require("path");
const fs = require("fs");

// Define log directory
const LOG_DIR = path.join(__dirname, "../../../logs");

// Create log directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
      }`;
    })
  ),
  transports: [
    new transports.File({
      filename: path.join(
        LOG_DIR,
        `merimen-${moment().format("YYYY-MM-DD")}.log`
      ),
    }),
    new transports.File({
      filename: path.join(
        LOG_DIR,
        `merimen-error-${moment().format("YYYY-MM-DD")}.log`
      ),
      level: "error",
    }),
    new transports.Console(),
  ],
});

module.exports = logger;
