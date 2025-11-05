const { parse } = require("csv-parse/sync");
const logger = require("./logger");

const parseCSV = (csvContent) => {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      cast: true,
      cast_date: true,
    });

    // Validate required fields
    const requiredFields = [
      "claim_number",
      "policy_number",
      "insured_name",
      "vehicle_number",
      "loss_date",
      "loss_time",
      "loss_location",
      "loss_description",
      "contact_person",
      "contact_number",
      "email",
      "vehicle_make",
      "vehicle_model",
      "vehicle_year",
      "workshop_name",
    ];

    records.forEach((record, index) => {
      const missingFields = requiredFields.filter((field) => !record[field]);
      if (missingFields.length > 0) {
        throw new Error(
          `Row ${index + 1} is missing required fields: ${missingFields.join(
            ", "
          )}`
        );
      }
    });

    return records;
  } catch (error) {
    logger.error("CSV parsing error:", error);
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
};

module.exports = {
  parseCSV,
};
