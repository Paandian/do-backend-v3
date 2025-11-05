const Client = require("ssh2-sftp-client");
const path = require("path");
const moment = require("moment");
const logger = require("../utils/logger");

class SftpService {
  constructor(config) {
    this.config = config;
    this.sftp = new Client();
  }

  async connect() {
    try {
      await this.sftp.connect({
        host: this.config.SFTP_HOST,
        port: this.config.SFTP_PORT,
        username: this.config.SFTP_USERNAME,
        password: this.config.SFTP_PASSWORD,
        timeout: this.config.CONNECTION_TIMEOUT,
      });
      logger.info("SFTP connection established");
    } catch (error) {
      logger.error(`SFTP connection error: ${error.message}`);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.sftp.end();
      logger.info("SFTP connection closed");
    } catch (error) {
      logger.error(`SFTP disconnect error: ${error.message}`);
    }
  }

  async listNewFiles() {
    try {
      // Try simple listing first
      const files = await this.sftp.list(this.config.INCOMING_DIR);
      logger.debug("Raw SFTP listing:", { files: files.slice(0, 2) }); // Log first few files for debugging

      if (!Array.isArray(files)) {
        throw new Error("SFTP server returned invalid file list");
      }

      const csvFiles = files
        .filter((file) => {
          const isValid =
            file &&
            typeof file.name === "string" &&
            file.type !== "d" &&
            file.name.toLowerCase().endsWith(".csv");

          logger.debug("File filter check:", {
            name: file?.name,
            type: file?.type,
            isValid,
          });

          return isValid;
        })
        .map((file) => ({
          name: file.name,
          type: file.type || "-",
          size: parseInt(file.size || "0", 10),
          modifyTime: new Date(file.modifyTime || Date.now()).getTime(),
        }));

      logger.debug("Filtered CSV files:", {
        count: csvFiles.length,
        files: csvFiles.map((f) => f.name),
      });

      return csvFiles;
    } catch (error) {
      logger.error("SFTP listing error:", {
        error: error.message,
        stack: error.stack,
        config: {
          dir: this.config.INCOMING_DIR,
        },
      });
      throw new Error(`Unable to list files: ${error.message}`);
    }
  }

  async moveFile(sourcePath, destPath) {
    try {
      const destDir = path.posix.dirname(destPath);
      const destFileName = path.posix.basename(destPath);
      const baseFileName = path.posix.basename(destFileName, ".csv");

      // Generate unique filename in destination directory
      const uniqueFileName = await this.generateUniqueFileName(
        baseFileName,
        destDir
      );
      const finalDestPath = path.posix.join(destDir, uniqueFileName);

      logger.info(`Moving file from ${sourcePath} to ${finalDestPath}`);
      await this.sftp.rename(sourcePath, finalDestPath);

      logger.info(`File moved successfully`, {
        from: sourcePath,
        to: finalDestPath,
        originalName: destFileName,
        finalName: uniqueFileName,
      });

      return finalDestPath;
    } catch (error) {
      logger.error(`Error moving file: ${error.message}`, {
        sourcePath,
        destPath,
        error: error.stack,
      });
      throw error;
    }
  }

  async moveAndTrackFile(sourcePath, destPath, status = "MOVED") {
    const db = require("../models");
    const SftpFile = db.sftpFile;

    try {
      // Move the file
      const finalDestPath = await this.moveFile(sourcePath, destPath);

      // Track the file movement
      await SftpFile.create({
        fileName: path.basename(finalDestPath),
        originalName: path.basename(sourcePath),
        location: this.getLocationFromPath(finalDestPath),
        fileSize: (await this.sftp.stat(finalDestPath)).size,
        uploadedAt: new Date(),
        status: status,
      });

      return finalDestPath;
    } catch (error) {
      logger.error(`Error moving and tracking file: ${error.message}`);
      throw error;
    }
  }

  getLocationFromPath(filePath) {
    if (filePath.includes(this.config.INCOMING_DIR)) return "incoming";
    if (filePath.includes(this.config.PROCESSED_DIR)) return "processed";
    if (filePath.includes(this.config.ERROR_DIR)) return "error";
    if (filePath.includes(this.config.TEMP_DIR)) return "temp";
    return "unknown";
  }

  async generateUniqueFileName(baseFileName, directory) {
    let counter = 0;
    let fileName = `${baseFileName}.csv`;

    logger.info(`Generating unique filename for ${fileName} in ${directory}`);

    while (true) {
      try {
        const filePath = path.posix.join(directory, fileName);
        const exists = await this.sftp.exists(filePath);

        if (!exists) {
          logger.info(`Generated unique filename: ${fileName}`);
          return fileName;
        }

        counter++;
        fileName = `${baseFileName}_${counter}.csv`;
        logger.debug(`File exists, trying new name: ${fileName}`);
      } catch (error) {
        logger.error(`Error checking file existence: ${error.message}`, {
          baseFileName,
          directory,
          attemptedName: fileName,
        });
        // If we can't check, assume file doesn't exist and return current name
        return fileName;
      }
    }
  }

  async generateNewFileName() {
    const baseFileName = moment().format("YYYYMMDD_HHmm");
    return this.generateUniqueFileName(baseFileName, this.config.INCOMING_DIR);
  }

  async generateProcessedFileName() {
    const baseFileName = `PROCESSED_${moment().format("YYYYMMDD_HHmm")}`;
    return this.generateUniqueFileName(baseFileName, this.config.PROCESSED_DIR);
  }

  async generateErrorFileName(originalFileName) {
    const timestamp = moment().format("YYYYMMDD_HHmm");
    const baseFileName = `ERROR_${timestamp}_${path.basename(
      originalFileName,
      ".csv"
    )}`;
    return this.generateUniqueFileName(baseFileName, this.config.ERROR_DIR);
  }
}

module.exports = SftpService;
