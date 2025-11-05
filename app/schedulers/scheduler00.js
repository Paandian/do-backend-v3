const path = require("path");
const moment = require("moment");
const logger = require("../utils/logger");
const CsvProcessor = require("../utils/csvProcessor");
const db = require("../models");

class MerimenScheduler {
  constructor(sftpService) {
    this.sftpService = sftpService;
    this.processing = false;
  }

  async processFiles() {
    if (this.processing) {
      logger.warn("Previous processing still in progress, skipping...");
      return;
    }

    this.processing = true;
    let sftpConnected = false;

    try {
      logger.info("Attempting SFTP connection");
      await this.sftpService.connect();
      sftpConnected = true;

      logger.info("Fetching list of new files");
      let files = [];

      try {
        files = await this.sftpService.listNewFiles();
        logger.debug("Retrieved files from SFTP:", {
          count: files.length,
          firstFile: files[0],
        });
      } catch (listError) {
        logger.error("File listing failed:", {
          error: listError.message,
          stack: listError.stack,
        });
        throw new Error(`Failed to list files: ${listError.message}`);
      }

      if (!files.length) {
        logger.info("No new files to process");
        return;
      }

      // Validate files array
      if (!Array.isArray(files)) {
        throw new Error(`Expected array of files, got ${typeof files}`);
      }

      // Additional validation of file objects
      files = files.filter((file) => {
        const isValid =
          file && typeof file.name === "string" && file.name.trim().length > 0;
        if (!isValid) {
          logger.warn("Skipping invalid file entry:", file);
        }
        return isValid;
      });

      logger.info(`Found ${files.length} files to process`, {
        filesFound: files.map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
        })),
      });

      for (const file of files) {
        logger.info(`Starting to process file: ${file.name}`, {
          fileDetails: file,
        });

        try {
          const tempFileName = await this.sftpService.generateNewFileName();
          const sftpTempPath = path.posix.join(
            this.sftpService.config.TEMP_DIR,
            tempFileName
          );

          // Move to temp directory first
          await this.sftpService.moveFile(
            path.posix.join(this.sftpService.config.INCOMING_DIR, file.name),
            sftpTempPath
          );
          logger.info("File moved to temp directory", { sftpTempPath });

          // Process the file
          const { results, summary } = await CsvProcessor.validateAndParseSftp(
            this.sftpService,
            sftpTempPath,
            db
          );

          logger.info(`File processing summary:`, {
            fileName: file.name,
            totalRecords: summary.totalRecords,
            successfulUploads: summary.successfulUploads,
            duplicateRecords: summary.duplicateRecords,
            failedRecords: summary.failedRecords,
            successRate: `${Math.round(
              (summary.successfulUploads / summary.totalRecords) * 100
            )}%`,
          });

          // Move to processed directory even if there were some duplicates
          const processedFileName =
            await this.sftpService.generateProcessedFileName();
          await this.sftpService.moveFile(
            sftpTempPath,
            path.posix.join(
              this.sftpService.config.PROCESSED_DIR,
              processedFileName
            )
          );

          logger.info("File processed and moved to processed directory", {
            processedFileName,
          });
        } catch (error) {
          logger.error(`Error processing file ${file.name}`, {
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
          });

          // Move from temp directory to error directory
          try {
            const errorFileName = await this.sftpService.generateErrorFileName(
              file.name
            );
            await this.sftpService.moveFile(
              sftpTempPath, // Changed from INCOMING_DIR to use temp path
              path.posix.join(this.sftpService.config.ERROR_DIR, errorFileName)
            );
            logger.info(
              `File moved from temp to error directory as ${errorFileName}`
            );
          } catch (moveError) {
            logger.error(
              `Failed to move file from temp to error directory: ${moveError.message}`
            );
          }
        }
      }
    } catch (error) {
      logger.error("Scheduler error", {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        connectionState: {
          processing: this.processing,
          sftpConnected,
        },
      });
    } finally {
      if (sftpConnected) {
        try {
          logger.info("Disconnecting SFTP");
          await this.sftpService.disconnect();
        } catch (disconnectError) {
          logger.error("Error disconnecting SFTP", {
            error: disconnectError.message,
          });
        }
      }
      this.processing = false;
      logger.info("Processing complete");
    }
  }
}

module.exports = MerimenScheduler;
