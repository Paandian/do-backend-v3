// import Client from "ssh2-sftp-client";
// import path from "path";
// import fs from "fs";
// import config from "../config/sftp.config";
// import logger from "../utils/logger";
const Client = require("ssh2-sftp-client");
const path = require("path");
const fs = require("fs");
const config = require("../config/sftp.config");
const logger = require("../utils/logger");

class MerimenSftpService {
  constructor() {
    this.sftp = new Client();
    this.tempDir = path.join(process.cwd(), "temp");
    this.processedDir = path.join(process.cwd(), "processed");
    this.ensureDirectories();
  }

  async ensureDirectories() {
    [this.tempDir, this.processedDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async connect() {
    try {
      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      logger.info("SFTP connection established (simulated)");
    } catch (err) {
      logger.error("SFTP connection error:", err);
      throw err;
    }
  }

  async disconnect() {
    try {
      // Simulate disconnection delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      logger.info("SFTP connection closed (simulated)");
    } catch (err) {
      logger.error("SFTP disconnect error:", err);
    }
  }

  async testConnection() {
    try {
      await this.connect();
      // Simulate directory listing
      const mockListing = [
        { name: "test1.csv", type: "-", size: 1024 },
        { name: "test2.csv", type: "-", size: 2048 },
      ];
      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.disconnect();
      return true;
    } catch (err) {
      logger.error("SFTP connection test failed:", err);
      return false;
    }
  }

  async downloadFiles() {
    try {
      const files = await this.sftp.list(config.INCOMING_DIR);
      const csvFiles = files.filter((file) => file.name.endsWith(".csv"));

      for (const file of csvFiles) {
        const remotePath = path.join(config.INCOMING_DIR, file.name);
        const localPath = path.join(this.tempDir, file.name);

        await this.sftp.fastGet(remotePath, localPath);
        logger.info(`Downloaded file: ${file.name}`);
      }

      return csvFiles;
    } catch (err) {
      logger.error("Error downloading files:", err);
      throw err;
    }
  }

  async readFile(filename) {
    const filePath = path.join(this.tempDir, filename);
    return fs.promises.readFile(filePath, "utf8");
  }

  async moveToProcessed(filename) {
    const sourcePath = path.join(this.tempDir, filename);
    const targetPath = path.join(this.processedDir, filename);

    try {
      await fs.promises.rename(sourcePath, targetPath);
      logger.info(`Moved file to processed: ${filename}`);

      // Move file to processed directory on SFTP server
      const remoteSource = path.join(config.INCOMING_DIR, filename);
      const remoteTarget = path.join(config.OUTGOING_DIR, filename);
      await this.sftp.rename(remoteSource, remoteTarget);
    } catch (err) {
      logger.error(`Error moving file ${filename}:`, err);
      throw err;
    }
  }

  async cleanupProcessedFiles() {
    const daysToKeep = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const files = await fs.promises.readdir(this.processedDir);

      for (const file of files) {
        const filePath = path.join(this.processedDir, file);
        const stats = await fs.promises.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.promises.unlink(filePath);
          logger.info(`Deleted old processed file: ${file}`);
        }
      }
    } catch (err) {
      logger.error("Error cleaning up processed files:", err);
      throw err;
    }
  }
}

module.exports = new MerimenSftpService();
