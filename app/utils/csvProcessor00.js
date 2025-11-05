const csv = require("csv-parse");
const fs = require("fs");
const moment = require("moment");
const logger = require("./logger");

class CsvProcessor {
  static generateTemplate() {
    const headers = [
      "claim_action",
      "merimen_case_id",
      "claim_type",
      "insurance_claim_no",
      "insured_name",
      "insured_id_no",
      "insured_tel",
      "insured_veh_reg_no",
      "date_of_loss",
      "time_of_loss",
      "policy_cover_note_no",
      "repairer_name",
      "handling_insurer",
      "claimant_insurer",
      "assignment_date",
      "cancellation_date",
      "editing_date",
      "adj_asg_remarks",
      "place_of_loss_postcode",
      "recommended_reserve",
      "adj_provi_fee",
      "police_report_date",
      "police_report_time",
    ].join(",");

    const sampleRow = [
      "New",
      "MER123456",
      "Motor",
      "CLM/2024/001",
      "John Doe",
      "123456789",
      "0123456789",
      "ABC1234",
      "2024-01-01",
      "14:30",
      "POL123456",
      "ABC Workshop",
      "Insurance Co (KL)",
      "XYZ Insurance (PJ)",
      "2024-01-02 09:00:00",
      "",
      "2024-01-02 09:00:00",
      "Urgent case",
      "50100",
      "1000.00",
      "150.00",
      "2024-01-01",
      "15:00",
    ].join(",");

    const comments = [
      "# CSV Template for Merimen Cases Upload",
      "# Field descriptions:",
      "# claim_action          - Claim action remarks",
      "# merimen_case_id      - Unique Merimen case ID (required)",
      "# claim_type           - Department/reftype",
      "# insurance_claim_no   - Insurance claim number",
      "# insured_name         - Name of insured",
      "# insured_id_no        - ID number of insured",
      "# insured_tel          - Contact number",
      "# insured_veh_reg_no   - Vehicle registration number",
      "# date_of_loss         - Date of loss (YYYY-MM-DD)",
      "# time_of_loss         - Time of loss (HH:mm)",
      "# policy_cover_note_no - Policy/Cover note number",
      "# repairer_name        - Name of repairer",
      "# handling_insurer     - Handling insurer name and location",
      "# claimant_insurer     - Claimant's insurer name and location",
      "# assignment_date      - Assignment date and time (YYYY-MM-DD HH:mm:ss)",
      "# cancellation_date    - Cancellation date and time (YYYY-MM-DD HH:mm:ss)",
      "# editing_date         - Editing date and time (YYYY-MM-DD HH:mm:ss)",
      "# adj_asg_remarks      - Adjustment assignment remarks",
      "# place_of_loss_postcode - Postcode of loss location",
      "# recommended_reserve  - Recommended reserve amount in RM",
      "# adj_provi_fee       - Adjustment provisional fee in RM",
      "# police_report_date   - Police report date (YYYY-MM-DD)",
      "# police_report_time   - Police report time (HH:mm)",
      "#",
    ].join("\n");

    return `${comments}\n${headers}\n${sampleRow}`;
  }

  // Helper method to create template file
  static async createTemplateFile(outputPath) {
    try {
      const template = this.generateTemplate();
      await fs.promises.writeFile(outputPath, template);
      logger.info(`Template CSV created at: ${outputPath}`);
      return true;
    } catch (error) {
      logger.error(`Error creating template: ${error.message}`);
      throw error;
    }
  }

  static async validateAndParse(filePath, db) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];

      fs.createReadStream(filePath)
        .pipe(csv.parse({ columns: true, trim: true }))
        .on("data", (row) => {
          if (this.validateRow(row)) {
            results.push(this.transformRow(row));
          } else {
            errors.push(`Invalid row: ${JSON.stringify(row)}`);
          }
        })
        .on("error", (error) => {
          logger.error(`CSV parsing error: ${error.message}`);
          reject(error);
        })
        .on("end", () => {
          if (errors.length > 0) {
            logger.error(`Validation errors: ${errors.join("; ")}`);
            reject(new Error("CSV validation failed"));
          } else {
            resolve(results);
          }
        });
    });
  }

  static async validateAndParseSftp(sftpClient, filePath, db) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      const duplicates = [];
      const processingSummary = {
        totalRecords: 0,
        successfulUploads: 0,
        duplicateRecords: 0,
        failedRecords: 0,
      };

      sftpClient.sftp
        .createReadStream(filePath)
        .pipe(csv.parse({ columns: true, trim: true, skip_empty_lines: true }))
        .on("data", (row) => {
          processingSummary.totalRecords++;
          let rowNumber = 1; // Track row numbers for better error reporting
          rowNumber++;
          try {
            if (this.validateRow(row)) {
              results.push(this.transformRow(row));
            } else {
              errors.push(`Row ${rowNumber}: Invalid data`);
            }
          } catch (error) {
            errors.push(`Row ${rowNumber}: ${error.message}`);
          }
        })
        .on("error", (error) => {
          logger.error(`CSV parsing error at row ${rowNumber}:`, error);
          reject(error);
        })
        .on("end", async () => {
          if (errors.length > 0) {
            const errorMessage = `CSV validation failed with ${
              errors.length
            } errors:\n${errors.join("\n")}`;
            logger.error(errorMessage);
            reject(new Error(errorMessage));
          } else {
            try {
              const chunkSize = 100;
              for (let i = 0; i < results.length; i += chunkSize) {
                const chunk = results.slice(i, i + chunkSize);
                await Promise.all(
                  chunk.map(async (record) => {
                    try {
                      await db.merimenData.upsert(record, {
                        where: { merimenCaseId: record.merimenCaseId },
                        returning: true,
                      });
                      processingSummary.successfulUploads++;
                    } catch (error) {
                      if (error.name === "SequelizeUniqueConstraintError") {
                        processingSummary.duplicateRecords++;
                        duplicates.push({
                          merimenCaseId: record.merimenCaseId,
                          error: error.message,
                        });
                      } else {
                        processingSummary.failedRecords++;
                      }
                    }
                  })
                );
              }

              // Enhanced logging with processing summary
              logger.info("File processing complete", {
                summary: {
                  totalRecords: processingSummary.totalRecords,
                  successfullyUploaded: processingSummary.successfulUploads,
                  duplicates: processingSummary.duplicateRecords,
                  failed: processingSummary.failedRecords,
                  successRate: `${Math.round(
                    (processingSummary.successfulUploads /
                      processingSummary.totalRecords) *
                      100
                  )}%`,
                },
              });

              if (duplicates.length > 0) {
                logger.warn(`Found ${duplicates.length} duplicate records`, {
                  duplicates,
                });
              }

              resolve({
                results,
                summary: processingSummary,
              });
            } catch (error) {
              reject(error);
            }
          }
        });
    });
  }

  static validateRow(row) {
    const errors = [];

    // Check required fields
    if (!row.merimen_case_id) {
      errors.push("Missing merimen_case_id");
    }

    // Flexible date parsing
    const dateFormats = ["DD/MM/YYYY", "YYYY-MM-DD", "D/M/YYYY", "DD-MM-YYYY"];
    const timeFormats = ["HH:mm", "H:mm", "HH:mm:ss"];

    // Parse date_of_loss with multiple formats
    if (row.date_of_loss) {
      const parsedDate = moment(row.date_of_loss, dateFormats);
      if (!parsedDate.isValid()) {
        errors.push(
          `Invalid date_of_loss format: ${row.date_of_loss}. Expected DD/MM/YYYY`
        );
      }
    } else {
      errors.push("Missing date_of_loss");
    }

    // Parse time_of_loss with multiple formats
    if (row.time_of_loss) {
      const parsedTime = moment(row.time_of_loss, timeFormats);
      if (!parsedTime.isValid()) {
        errors.push(
          `Invalid time_of_loss format: ${row.time_of_loss}. Expected HH:mm`
        );
      }
    } else {
      errors.push("Missing time_of_loss");
    }

    // Log validation details for debugging
    if (errors.length > 0) {
      logger.error("Row validation failed", {
        errors,
        rowData: row,
      });
      return false;
    }

    return true;
  }

  static transformRow(row) {
    const dateFormats = ["DD/MM/YYYY", "YYYY-MM-DD", "D/M/YYYY", "DD-MM-YYYY"];
    const timeFormats = ["HH:mm", "H:mm", "HH:mm:ss"];

    const parseDateField = (dateStr) => {
      if (!dateStr) return null;
      const parsed = moment(dateStr, dateFormats);
      return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
    };

    const parseTimeField = (timeStr) => {
      if (!timeStr) return null;
      const parsed = moment(timeStr, timeFormats);
      return parsed.isValid() ? parsed.format("HH:mm:ss") : null;
    };

    const parseDateTimeField = (dateTimeStr) => {
      if (!dateTimeStr) return null;
      const parsed = moment(dateTimeStr, [
        ...dateFormats.map((df) => `${df} HH:mm:ss`),
        ...dateFormats.map((df) => `${df} HH:mm`),
      ]);
      return parsed.isValid() ? parsed.toDate() : null;
    };

    return {
      claimAction: row.claim_action,
      merimenCaseId: row.merimen_case_id,
      claimType: row.claim_type,
      insuranceClaimNo: row.insurance_claim_no,
      insuredName: row.insured_name,
      insuredIdNo: row.insured_id_no,
      insuredTel: row.insured_tel,
      insuredVehRegNo: row.insured_veh_reg_no,
      dateOfLoss: parseDateField(row.date_of_loss),
      timeOfLoss: parseTimeField(row.time_of_loss),
      policyCoverNoteNo: row.policy_cover_note_no,
      repairerName: row.repairer_name,
      handlingInsurer: row.handling_insurer,
      claimantInsurer: row.claimant_insurer,
      assignmentDate: parseDateTimeField(row.assignment_date),
      cancellationDate: parseDateTimeField(row.cancellation_date),
      editingDate: parseDateTimeField(row.editing_date),
      adjAsgRemarks: row.adj_asg_remarks,
      placeOfLossPostcode: row.place_of_loss_postcode,
      recommendedReserve: parseFloat(row.recommended_reserve) || 0,
      adjProviFee: parseFloat(row.adj_provi_fee) || 0,
      policeReportDate: parseDateField(row.police_report_date),
      policeReportTime: parseTimeField(row.police_report_time),
      // Add required fields with default values
      status: "NEW",
      is_processed: false,
      processing_attempts: 0,
      // Convert dates properly
      created_at: new Date(),
      updated_at: new Date(),
    };
  }
}

module.exports = CsvProcessor;
