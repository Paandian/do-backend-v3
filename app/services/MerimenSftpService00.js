const Client = require("ssh2-sftp-client");
const path = require("path");
const fs = require("fs");
const config = require("../config/sftp.config");
const logger = require("../utils/logger");

class MerimenSftpService {
  constructor() {
    this.pool = [];
    this.maxConnections = 3;
    this.maxRetries = 3;
    this.tempDir = config.TEMP_DIR;
    this.processedDir = config.PROCESSED_DIR;
    this.errorDir = config.ERROR_DIR;
    // this.ensureDirectories();
  }

  async getConnection() {
    // Check for available connection
    const available = this.pool.find((conn) => !conn.inUse);
    if (available) {
      available.inUse = true;
      return available.client;
    }

    // Create new if pool not full
    if (this.pool.length < this.maxConnections) {
      const client = new Client();
      await client.connect({
        host: config.SFTP_HOST,
        port: config.SFTP_PORT,
        username: config.SFTP_USERNAME,
        password: config.SFTP_PASSWORD,
        readyTimeout: 20000,
      });

      const conn = {
        client,
        inUse: true,
        created: new Date(),
      };

      this.pool.push(conn);
      return client;
    }

    throw new Error("Connection pool full");
  }

  async releaseConnection(client) {
    const conn = this.pool.find((c) => c.client === client);
    if (conn) {
      conn.inUse = false;
    }
  }

  async disconnect() {
    await Promise.all(
      this.pool.map(async (conn) => {
        try {
          await conn.client.end();
        } catch (err) {
          logger.error("Error closing connection:", err);
        }
      })
    );
    this.pool = [];
  }

  ensureDirectories() {
    [this.tempDir, this.processedDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async testConnection() {
    let client;
    try {
      client = await this.getConnection();
      await client.list("/");
      return true;
    } catch (err) {
      logger.error("Connection test failed:", err);
      return false;
    } finally {
      if (client) {
        await this.releaseConnection(client);
      }
    }
  }

  async downloadFiles() {
    let client;
    try {
      client = await this.getConnection();
      const files = await client.list(config.INCOMING_DIR);
      const csvFiles = files.filter((file) => file.name.endsWith(".csv"));
      const processedFiles = [];

      for (const file of csvFiles) {
        try {
          const sourcePath = path.posix.join(config.INCOMING_DIR, file.name);
          const targetPath = path.posix.join(config.TEMP_DIR, file.name);

          // First download the file to temp directory
          await client.get(sourcePath, targetPath);
          logger.info(`Downloaded file to temp: ${file.name}`);

          // Only after successful download, delete the source file
          await client.delete(sourcePath);
          logger.info(`Deleted source file: ${file.name}`);

          processedFiles.push(file);
        } catch (err) {
          logger.error(`Error processing individual file ${file.name}:`, err);
          continue; // Skip this file and continue with others
        }
      }

      return processedFiles;
    } catch (err) {
      logger.error("File transfer failed:", err);
      throw err;
    } finally {
      if (client) {
        await this.releaseConnection(client);
      }
    }
  }

  async moveFileAfterProcessing(filename, success = true) {
    let client;
    try {
      client = await this.getConnection();
      const sourcePath = path.posix.join(config.TEMP_DIR, filename);
      const targetDir = success ? config.PROCESSED_DIR : config.ERROR_DIR;
      const targetPath = path.posix.join(targetDir, filename);

      // Ensure target directory exists
      try {
        await client.mkdir(targetDir, true);
      } catch (mkdirErr) {
        // Ignore if directory already exists
        if (mkdirErr.code !== "EEXIST") {
          throw mkdirErr;
        }
      }

      // Use get/put instead of rename
      const fileStream = await client.get(sourcePath);
      await client.put(fileStream, targetPath);

      // Delete the source file after successful move
      await client.delete(sourcePath);

      logger.info(
        `Moved file to ${success ? "processed" : "error"} folder: ${filename}`
      );
    } catch (err) {
      logger.error(`Error moving file ${filename}:`, err);
      throw err;
    } finally {
      if (client) {
        await this.releaseConnection(client);
      }
    }
  }

  async readFile(filename) {
    let client;
    try {
      client = await this.getConnection();
      const filePath = path.posix.join(config.TEMP_DIR, filename);
      const data = await client.get(filePath);
      return data.toString("utf8");
    } catch (err) {
      logger.error(`Error reading file ${filename}:`, err);
      throw err;
    } finally {
      if (client) {
        await this.releaseConnection(client);
      }
    }
  }

  async cleanupProcessedFiles() {
    let client;
    try {
      client = await this.getConnection();
      const daysToKeep = 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const processedFiles = await client.list(config.PROCESSED_DIR);
      const errorFiles = await client.list(config.ERROR_DIR);

      for (const file of [...processedFiles, ...errorFiles]) {
        if (new Date(file.modifyTime) < cutoffDate) {
          const filePath = path.posix.join(
            file.type === "processed" ? config.PROCESSED_DIR : config.ERROR_DIR,
            file.name
          );
          await client.delete(filePath);
          logger.info(`Deleted old file: ${file.name}`);
        }
      }
    } catch (err) {
      logger.error("Error cleaning up files:", err);
      throw err;
    } finally {
      if (client) {
        await this.releaseConnection(client);
      }
    }
  }

  async checkFileExists(filename) {
    try {
      const stats = await this.sftp.stat(`/incoming/cases/${filename}`);
      return stats !== undefined && stats !== null;
    } catch (error) {
      return false;
    }
  }

  async ensureDirectoryExists(dirName) {
    try {
      await this.sftp.mkdir(`/${dirName}`, true);
    } catch (error) {
      // If directory already exists, ignore the error
      if (error.code !== "EEXIST") {
        throw error;
      }
    }
  }
}

module.exports = MerimenSftpService;
