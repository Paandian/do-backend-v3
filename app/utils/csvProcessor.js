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
      const processingSummary = {
        totalRecords: 0,
        successfulUploads: 0,
        failedRecords: 0,
      };

      let rowNumber = 0;

      sftpClient.sftp
        .createReadStream(filePath)
        .pipe(
          csv.parse({
            columns: true,
            trim: true,
            skip_empty_lines: true,
            skipRecordsWithError: true,
          })
        )
        .on("data", (row) => {
          processingSummary.totalRecords++;
          rowNumber++;

          try {
            const validationErrors = this.validateRowWithDetails(row);
            if (validationErrors.length === 0) {
              results.push(this.transformRow(row));
            } else {
              errors.push(`Row ${rowNumber}: ${validationErrors.join(", ")}`);
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
                      // Changed from upsert to create to allow duplicates
                      await db.merimenData.create(record);
                      processingSummary.successfulUploads++;
                    } catch (error) {
                      logger.error(`Failed to insert record:`, {
                        merimenCaseId: record.merimenCaseId,
                        error: error.message,
                      });
                      processingSummary.failedRecords++;
                    }
                  })
                );
              }

              logger.info("File processing complete", {
                summary: {
                  totalRecords: processingSummary.totalRecords,
                  successfullyUploaded: processingSummary.successfulUploads,
                  failed: processingSummary.failedRecords,
                  successRate: `${Math.round(
                    (processingSummary.successfulUploads /
                      processingSummary.totalRecords) *
                      100
                  )}%`,
                },
              });

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

  static validateRowWithDetails(row) {
    const errors = [];

    // Map incoming column names to expected names
    const merimenCaseId = row["Merimen Case ID"] || row["merimen_case_id"];
    const dateOfLoss = row["Date of Loss"] || row["date_of_loss"];
    const timeOfLoss = row["Time of Loss"] || row["time_of_loss"];

    // Check required fields
    if (!merimenCaseId) {
      errors.push("Missing Merimen Case ID");
    }

    // Flexible date parsing
    const dateFormats = ["DD/MM/YYYY", "YYYY-MM-DD", "D/M/YYYY", "DD-MM-YYYY"];
    const timeFormats = ["HH:mm", "H:mm", "HH:mm:ss"];

    // Parse date_of_loss with multiple formats
    if (dateOfLoss) {
      const parsedDate = moment(dateOfLoss, dateFormats);
      if (!parsedDate.isValid()) {
        errors.push(`Invalid Date of Loss format: ${dateOfLoss}`);
      }
    } else {
      errors.push("Missing Date of Loss");
    }

    // Parse time_of_loss with multiple formats
    if (timeOfLoss) {
      const parsedTime = moment(timeOfLoss, timeFormats);
      if (!parsedTime.isValid()) {
        errors.push(`Invalid Time of Loss format: ${timeOfLoss}`);
      }
    } else {
      errors.push("Missing Time of Loss");
    }

    return errors;
  }

  static validateRow(row) {
    return this.validateRowWithDetails(row).length === 0;
  }

  static transformRow(row) {
    const dateFormats = ["DD/MM/YYYY", "YYYY-MM-DD", "D/M/YYYY", "DD-MM-YYYY"];
    const timeFormats = ["HH:mm", "H:mm", "HH:mm:ss"];

    const getStringValue = (value) => {
      return value === undefined || value === null ? "" : String(value).trim();
    };

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

    const parseNumber = (value, defaultValue = 0) => {
      if (value === undefined || value === null || value === "")
        return defaultValue;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    return {
      claimAction: getStringValue(row["Claim Action"] || row["claim_action"]),
      merimenCaseId: getStringValue(
        row["Merimen Case ID"] || row["merimen_case_id"]
      ),
      claimType: getStringValue(row["Claim Type"] || row["claim_type"]),
      insuranceClaimNo: getStringValue(
        row["Insurance Claim No"] || row["insurance_claim_no"]
      ),
      insuredName: getStringValue(row["Insured Name"] || row["insured_name"]),
      insuredIdNo: getStringValue(
        row["Insured ID No."] || row["insured_id_no"]
      ),
      insuredTel: getStringValue(row["Insured Tel"] || row["insured_tel"]),
      insuredVehRegNo: getStringValue(
        row["Insured VehRegNo"] || row["insured_veh_reg_no"]
      ),
      dateOfLoss: parseDateField(row["Date of Loss"] || row["date_of_loss"]),
      timeOfLoss: parseTimeField(row["Time of Loss"] || row["time_of_loss"]),
      policyCoverNoteNo: getStringValue(
        row["Policy/Cover Note No"] || row["policy_cover_note_no"]
      ),
      repairerName: getStringValue(
        row["Repairer Name"] || row["repairer_name"]
      ),
      handlingInsurer: getStringValue(
        row["Handling Insurer"] || row["handling_insurer"]
      ),
      claimantInsurer: getStringValue(
        row["Claimant Insurer"] || row["claimant_insurer"]
      ),
      assignmentDate: parseDateTimeField(
        row["Assignment Date"] || row["assignment_date"]
      ),
      cancellationDate: parseDateTimeField(
        row["Cancellation Date"] || row["cancellation_date"]
      ),
      editingDate: parseDateTimeField(
        row["Editing Date"] || row["editing_date"]
      ),
      adjAsgRemarks: getStringValue(
        row["Adj Asg. Remarks"] || row["adj_asg_remarks"]
      ),
      placeOfLossPostcode: getStringValue(
        row["Place of Loss"] || row["place_of_loss_postcode"]
      ),
      recommendedReserve: parseNumber(
        row["Recmd'ed Resv"] || row["recommended_reserve"]
      ),
      adjProviFee: parseNumber(row["Adj. Provi. Fee"] || row["adj_provi_fee"]),
      policeReportDate: parseDateField(
        row["Police Report Date"] || row["police_report_date"]
      ),
      policeReportTime: parseTimeField(
        row["Police Report Time"] || row["police_report_time"]
      ),
      status: "NEW",
      is_processed: false,
      processing_attempts: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }
}

module.exports = CsvProcessor;
