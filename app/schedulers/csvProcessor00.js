const { parse } = require("csv-parse");
const logger = require("../utils/logger");
const db = require("../models"); // Assuming you have Sequelize models set up
const { Sequelize } = require("sequelize");

const processCSVContent = async (csvContent) => {
  try {
    const records = await parseCSV(csvContent);
    await validateRecords(records);
    await saveToDatabase(records);
    return true;
  } catch (error) {
    logger.error("CSV Processing error:", error);
    throw error;
  }
};

const parseCSV = (csvContent) => {
  return new Promise((resolve, reject) => {
    const records = [];
    const parser = parse({
      delimiter: ",",
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    parser.on("readable", function () {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(formatRecord(record));
      }
    });

    parser.on("error", function (err) {
      reject(err);
    });

    parser.on("end", function () {
      resolve(records);
    });

    parser.write(csvContent);
    parser.end();
  });
};

const formatRecord = (record) => {
  return {
    caseNumber: record.CaseNumber || record.casenumber || "",
    claimNumber: record.ClaimNumber || record.claimnumber || "",
    insuredName: record.InsuredName || record.insuredname || "",
    lossDate: record.LossDate || record.lossdate || null,
    reportDate: record.ReportDate || record.reportdate || null,
    status: record.Status || record.status || "",
    remarks: record.Remarks || record.remarks || "",
    // Add more fields as needed
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

const validateRecords = async (records) => {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("No valid records found in CSV");
  }

  const invalidRecords = records.filter(
    (record) => !record.caseNumber || !record.claimNumber
  );

  if (invalidRecords.length > 0) {
    throw new Error(`Found ${invalidRecords.length} invalid records`);
  }
};

const saveToDatabase = async (records) => {
  const transaction = await db.sequelize.transaction();

  try {
    for (const record of records) {
      await db.MerimenCase.upsert(record, {
        where: { caseNumber: record.caseNumber },
        transaction,
      });
    }

    await transaction.commit();
    logger.info(`Successfully saved ${records.length} records to database`);
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Database operation failed: ${error.message}`);
  }
};

module.exports = {
  processCSVContent,
};
