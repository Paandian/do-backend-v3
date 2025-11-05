const cron = require("node-cron");
const logger = require("../utils/logger");
const MerimenSftpService = require("../services/MerimenSftpService");
const { processCSVContent } = require("../services/csvProcessor"); // You'll need to create this

class MerimenScheduler {
  constructor() {
    this.merimenService = new MerimenSftpService();
  }

  async processFiles() {
    try {
      logger.info("Starting Merimen file processing...");

      // Test connection first
      const isConnected = await this.merimenService.testConnection();
      if (!isConnected) {
        throw new Error("Failed to connect to SFTP server");
      }

      // Download files from incoming to temp
      const files = await this.merimenService.downloadFiles();
      logger.info(`Found ${files.length} files to process`);

      // Process each file
      for (const file of files) {
        try {
          // Read file content
          const csvContent = await this.merimenService.readFile(file.name);

          // Process CSV content (implement this based on your needs)
          await processCSVContent(csvContent);

          // Move to processed folder on success
          await this.merimenService.moveFileAfterProcessing(file.name, true);
          logger.info(`Successfully processed file: ${file.name}`);
        } catch (error) {
          logger.error(`Error processing file ${file.name}:`, error);
          // Move to error folder on failure
          await this.merimenService.moveFileAfterProcessing(file.name, false);
        }
      }

      // Cleanup old files
      await this.merimenService.cleanupProcessedFiles();
    } catch (error) {
      logger.error("Error in Merimen scheduler:", error);
    } finally {
      // Always disconnect
      await this.merimenService.disconnect();
    }
  }

  start() {
    // Run every 5 minutes
    cron.schedule("*/5 * * * *", () => {
      this.processFiles();
    });

    // Run immediately on start
    this.processFiles();
  }
}

module.exports = new MerimenScheduler();
