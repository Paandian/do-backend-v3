const Client = require("ssh2-sftp-client");
const config = require("../config/sftp.config");
const logger = require("../utils/logger");

class SftpDiagnosticsService {
  constructor() {
    this.sftp = new Client();
    this.lastStatus = null;
    this.lastCheck = null;
  }

  async runDiagnostics() {
    const startTime = Date.now();
    const results = {
      status: "pending",
      connection: null,
      directories: {},
      permissions: {},
      latency: null,
      timestamp: new Date(),
      details: [],
    };

    try {
      // Test basic connection
      await this.testConnection(results);

      // Test directory access
      await this.testDirectories(results);

      // Test write permissions
      await this.testPermissions(results);

      // Calculate latency
      results.latency = Date.now() - startTime;
      results.status = "success";

      this.lastStatus = results;
      this.lastCheck = new Date();

      return results;
    } catch (error) {
      results.status = "error";
      results.error = error.message;
      logger.error("SFTP Diagnostics failed:", error);
      throw error;
    } finally {
      try {
        await this.sftp.end();
      } catch (e) {
        logger.error("Error closing SFTP connection:", e);
      }
    }
  }

  async testConnection(results) {
    try {
      await this.sftp.connect({
        host: config.SFTP_HOST,
        port: config.SFTP_PORT,
        username: config.SFTP_USERNAME,
        password: config.SFTP_PASSWORD,
        readyTimeout: config.CONNECTION_TIMEOUT,
      });
      results.connection = "successful";
      results.details.push({
        test: "connection",
        status: "success",
        timestamp: new Date(),
      });
    } catch (error) {
      results.connection = "failed";
      results.details.push({
        test: "connection",
        status: "error",
        error: error.message,
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async testDirectories(results) {
    const directories = [
      config.INCOMING_DIR,
      config.OUTGOING_DIR,
      config.ERROR_DIR,
    ];

    for (const dir of directories) {
      try {
        const exists = await this.sftp.exists(dir);
        results.directories[dir] = exists ? "exists" : "missing";
        results.details.push({
          test: "directory",
          path: dir,
          status: exists ? "success" : "warning",
          timestamp: new Date(),
        });
      } catch (error) {
        results.directories[dir] = "error";
        results.details.push({
          test: "directory",
          path: dir,
          status: "error",
          error: error.message,
          timestamp: new Date(),
        });
      }
    }
  }

  async testPermissions(results) {
    const testFile = `test-${Date.now()}.txt`;
    const testContent = "SFTP Test File";

    try {
      // Test write
      await this.sftp.put(
        Buffer.from(testContent),
        `${config.INCOMING_DIR}/${testFile}`
      );
      results.permissions.write = true;

      // Test read
      const data = await this.sftp.get(`${config.INCOMING_DIR}/${testFile}`);
      results.permissions.read = true;

      // Test delete
      await this.sftp.delete(`${config.INCOMING_DIR}/${testFile}`);
      results.permissions.delete = true;

      results.details.push({
        test: "permissions",
        status: "success",
        timestamp: new Date(),
      });
    } catch (error) {
      results.permissions = {
        error: error.message,
      };
      results.details.push({
        test: "permissions",
        status: "error",
        error: error.message,
        timestamp: new Date(),
      });
    }
  }

  async getConnectionStatus() {
    return {
      lastCheck: this.lastCheck,
      lastStatus: this.lastStatus,
      isConnected: this.lastStatus?.status === "success",
      latency: this.lastStatus?.latency || null,
    };
  }
}

module.exports = new SftpDiagnosticsService();
