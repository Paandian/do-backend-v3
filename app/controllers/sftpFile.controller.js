const db = require("../models");
const SftpFile = db.sftpFile;
const SftpService = require("../services/sftpService");
const config = require("../config/sftp.config");
const logger = require("../utils/logger");

exports.listFiles = async (req, res) => {
  try {
    const location = req.query.location || "incoming";
    const sftpService = new SftpService(config);

    // Get files from database
    const dbFiles = await SftpFile.findAll({
      where: { location },
      order: [["uploaded_at", "DESC"]],
    });

    // Get real-time files from SFTP
    await sftpService.connect();
    let directoryPath;
    switch (location) {
      case "incoming":
        directoryPath = config.INCOMING_DIR;
        break;
      case "processed":
        directoryPath = config.PROCESSED_DIR;
        break;
      case "error":
        directoryPath = config.ERROR_DIR;
        break;
      case "temp":
        directoryPath = config.TEMP_DIR;
        break;
      default:
        directoryPath = config.INCOMING_DIR;
    }

    const sftpFiles = await sftpService.list(directoryPath);
    await sftpService.disconnect();

    // Merge SFTP files info with database records
    const mergedFiles = sftpFiles.map((sftpFile) => {
      const dbFile = dbFiles.find((f) => f.fileName === sftpFile.name);
      return {
        ...sftpFile,
        status: dbFile?.status || "UNKNOWN",
        processingSummary: dbFile?.processingSummary || null,
        uploadedAt: dbFile?.uploadedAt || sftpFile.modifyTime,
        processedAt: dbFile?.processedAt || null,
        errorAt: dbFile?.errorAt || null,
        errorMessage: dbFile?.errorMessage || null,
      };
    });

    res.send(mergedFiles);
  } catch (err) {
    logger.error("Error listing SFTP files:", err);
    res.status(500).send({
      message: err.message || "Error occurred while retrieving files.",
    });
  }
};

exports.getFileStats = async (req, res) => {
  try {
    const stats = await SftpFile.findAll({
      attributes: [
        "location",
        [db.Sequelize.fn("COUNT", db.Sequelize.col("id")), "count"],
        [db.Sequelize.fn("MAX", db.Sequelize.col("uploaded_at")), "lastUpload"],
      ],
      group: ["location"],
    });

    res.send(stats);
  } catch (err) {
    logger.error("Error getting file stats:", err);
    res.status(500).send({
      message:
        err.message || "Error occurred while retrieving file statistics.",
    });
  }
};
