const cron = require("node-cron");
const MerimenSftpService = require("../services/MerimenSftpService");
const logger = require("../utils/logger");
const { processCSVContent } = require("../services/MerimenProcessorService");

class MerimenScheduler {
  constructor(sftpService) {
    this.sftpService = sftpService;
  }

  async startJobs() {
    // Start hourly job - runs every hour
    this.hourlyJob = cron.schedule("* * * * *", async () => {
      try {
        console.log("Running hourly Merimen job...");
        // Add your hourly job logic here
        await this.processHourlyTask();
      } catch (error) {
        console.error("Error in hourly job:", error);
      }
    });

    // Start cleanup job - runs daily at midnight
    this.cleanupJob = cron.schedule("0 0 * * *", async () => {
      try {
        console.log("Running daily cleanup job...");
        // Add your cleanup job logic here
        await this.processCleanupTask();
      } catch (error) {
        console.error("Error in cleanup job:", error);
      }
    });

    // Start both jobs
    this.hourlyJob.start();
    // this.cleanupJob.start();
  }

  async processHourlyTask() {
    try {
      logger.info("Starting Merimen file processing...");

      // Test connection first
      const isConnected = await this.sftpService.testConnection();
      if (!isConnected) {
        throw new Error("Failed to connect to SFTP server");
      }

      // Download files from incoming to temp with retry
      let retryCount = 0;
      const maxRetries = 3;
      let files = [];

      while (retryCount < maxRetries) {
        try {
          files = await this.sftpService.downloadFiles();
          break;
        } catch (downloadError) {
          retryCount++;
          logger.error(`Download attempt ${retryCount} failed:`, downloadError);
          if (retryCount === maxRetries) {
            throw new Error(
              `Failed to download files after ${maxRetries} attempts: ${downloadError.message}`
            );
          }
          // Wait for 5 seconds before retrying
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }

      logger.info(`Found ${files.length} files to process`);

      // Process each file
      for (const file of files) {
        try {
          // Verify file exists before processing
          // const fileExists = await this.sftpService.checkFileExists(file.name);
          // if (!fileExists) {
          //   logger.error(`File ${file.name} not found on SFTP server`);
          //   continue;
          // }

          // Read file content
          const csvContent = await this.sftpService.readFile(file.name);
          console.log("csvContent:", csvContent);

          // Process CSV content
          await processCSVContent(csvContent);

          // Verify destination path exists before moving
          await this.sftpService.ensureDirectoryExists("processed");
          await this.sftpService.ensureDirectoryExists("error");

          // Move to processed folder on success
          await this.sftpService.moveFileAfterProcessing(file.name, true);
          logger.info(`Successfully processed file: ${file.name}`);
        } catch (error) {
          logger.error(`Error processing file ${file.name}:`, error);
          // Ensure error directory exists
          await this.sftpService.ensureDirectoryExists("error");
          // Move to error folder on failure
          await this.sftpService.moveFileAfterProcessing(file.name, false);
        }
      }

      // Cleanup old files
      await this.sftpService.cleanupProcessedFiles();
    } catch (error) {
      logger.error("Error in Merimen scheduler:", error.stack || error);
    } finally {
      // Always disconnect
      await this.sftpService.disconnect();
    }
  }

  async processCleanupTask() {
    try {
      logger.info("Starting daily cleanup of processed files");
      await this.sftpService.cleanupProcessedFiles();
    } catch (err) {
      logger.error("Failed to cleanup processed files:", err);
    }
  }

  stopJobs() {
    if (this.hourlyJob) this.hourlyJob.stop();
    // if (this.cleanupJob) this.cleanupJob.stop();
  }
}

module.exports = MerimenScheduler;
