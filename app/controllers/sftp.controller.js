const SftpDiagnosticsService = require("../services/SftpDiagnosticsService");
const logger = require("../utils/logger");

exports.testConnection = async (req, res) => {
  try {
    const results = await SftpDiagnosticsService.runDiagnostics();
    logger.info("SFTP diagnostics completed", results);
    res.json(results);
  } catch (err) {
    logger.error("SFTP test failed:", err);
    res.status(500).json({
      status: "error",
      message: "SFTP connection test failed",
      error: err.message,
      timestamp: new Date(),
    });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const status = await SftpDiagnosticsService.getConnectionStatus();
    res.json(status);
  } catch (err) {
    logger.error("Failed to get SFTP status:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to get SFTP status",
      error: err.message,
    });
  }
};
