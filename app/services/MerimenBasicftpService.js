import { FileInfo, ftp } from "basic-ftp";
import path from "path";
import fs from "fs";
import config from "../config/sftp.config";
import logger from "../utils/logger";

class MerimenSftpService {
  constructor() {
    this.client = new ftp.Client();
    this.client.ftp.verbose = process.env.NODE_ENV === "development";
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
      await this.client.access({
        host: config.SFTP_HOST,
        port: config.SFTP_PORT,
        user: config.SFTP_USERNAME,
        password: config.SFTP_PASSWORD,
        secure: true, // Enable for SFTP, false for regular FTP
      });
      logger.info("FTP connection established");
    } catch (err) {
      logger.error("FTP connection error:", err);
      throw err;
    }
  }

  async disconnect() {
    this.client.close();
    logger.info("FTP connection closed");
  }

  async downloadFiles() {
    try {
      await this.client.cd(config.INCOMING_DIR);
      const files = await this.client.list();
      const csvFiles = files.filter((file) => file.name.endsWith(".csv"));

      for (const file of csvFiles) {
        const localPath = path.join(this.tempDir, file.name);
        await this.client.downloadTo(localPath, file.name);
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
      // Move local file
      await fs.promises.rename(sourcePath, targetPath);
      logger.info(`Moved local file to processed: ${filename}`);

      // Move remote file
      await this.client.cd(config.INCOMING_DIR);
      await this.client.rename(filename, `../processed/${filename}`);
      logger.info(`Moved remote file to processed: ${filename}`);
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

export default new MerimenSftpService();
