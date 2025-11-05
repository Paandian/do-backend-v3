require("dotenv").config();

module.exports = {
  SFTP_HOST: process.env.SFTP_HOST || "68.183.237.98",
  SFTP_PORT: parseInt(process.env.SFTP_PORT) || 22,
  SFTP_USERNAME: process.env.SFTP_USERNAME || "adjmeri",
  SFTP_PASSWORD: process.env.SFTP_PASSWORD || '[8G"r(5iY91~',
  TEMP_DIR: process.env.SFTP_TEMP_DIR || "temp",
  INCOMING_DIR: process.env.SFTP_INCOMING_DIR || "incoming/cases",
  PROCESSED_DIR: process.env.SFTP_PROCESSED_DIR || "processed/cases",
  ERROR_DIR: process.env.SFTP_ERROR_DIR || "error/cases",
  RETRY_ATTEMPTS: parseInt(process.env.SFTP_RETRY_ATTEMPTS) || 3,
  RETRY_DELAY: parseInt(process.env.SFTP_RETRY_DELAY) || 5000, // milliseconds
  CONNECTION_TIMEOUT: parseInt(process.env.SFTP_CONNECTION_TIMEOUT) || 20000, // milliseconds
  KEEPALIVE_INTERVAL: 10000, // 10 seconds
  RECONNECT_ATTEMPTS: 3,
  DEBUG: true,
  CONN_OPTIONS: {
    readyTimeout: 30000,
    strictVendor: false,
    algorithms: {
      kex: [
        "diffie-hellman-group1-sha1",
        "diffie-hellman-group14-sha1",
        "diffie-hellman-group-exchange-sha1",
        "diffie-hellman-group-exchange-sha256",
      ],
    },
  },
};
