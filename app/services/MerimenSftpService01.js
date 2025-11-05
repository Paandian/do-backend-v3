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
    this.localTempDir = path.join(process.cwd(), "temp");
    this.ensureLocalDirectories();
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

  ensureLocalDirectories() {
    const dirs = [this.localTempDir];
    dirs.forEach((dir) => {
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
          const remoteFilePath = path.posix.join(
            config.INCOMING_DIR,
            file.name
          );
          const localFilePath = path.join(this.localTempDir, file.name);

          // Download file to local temp directory
          await client.fastGet(remoteFilePath, localFilePath);
          logger.info(`Downloaded ${file.name} to local temp directory`);

          // Delete the remote file after successful download
          await client.delete(remoteFilePath);
          logger.info(`Deleted remote file: ${file.name}`);

          processedFiles.push({
            ...file,
            localPath: localFilePath,
          });
        } catch (err) {
          logger.error(`Error downloading file ${file.name}:`, err);
          continue;
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
      const localFilePath = path.join(this.localTempDir, filename);
      const remoteDir = success ? config.PROCESSED_DIR : config.ERROR_DIR;
      const remoteFilePath = path.posix.join(remoteDir, filename);

      // Ensure remote directory exists
      await client.mkdir(remoteDir, true);

      // Upload file to new location
      await client.fastPut(localFilePath, remoteFilePath);

      // Delete local temp file
      fs.unlinkSync(localFilePath);

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
    try {
      const localFilePath = path.join(this.localTempDir, filename);
      return fs.readFileSync(localFilePath, "utf8");
    } catch (err) {
      logger.error(`Error reading local file ${filename}:`, err);
      throw err;
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
