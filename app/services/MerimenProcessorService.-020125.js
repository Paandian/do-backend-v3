const db = require("../models");
const logger = require("../utils/logger");
const MerimenSftpService = require("./MerimenSftpService");
const { parseCSV } = require("../utils/csvParser");
const moment = require("moment");

class MerimenProcessorService {
  constructor() {
    this.validateDatabaseModels();
  }

  validateDatabaseModels() {
    if (!db || !db.MerimenCases || !db.Insurers) {
      const error = new Error("Database models not properly initialized");
      logger.error("Database initialization error:", {
        dbExists: !!db,
        merimenCasesExists: !!db?.MerimenCases,
        insurersExists: !!db?.Insurers,
      });
      throw error;
    }
  }

  async processIncomingFile(file) {
    logger.info(`Starting to process file: ${file.name}`);
    try {
      const csvData = await MerimenSftpService.readFile(file.name);
      const records = parseCSV(csvData);

      for (const record of records) {
        await this.processRecord(record);
      }

      await MerimenSftpService.moveToProcessed(file.name);
      logger.info(`Successfully processed file: ${file.name}`);
    } catch (err) {
      logger.error(`Failed to process file ${file.name}:`, err);
      throw err;
    }
  }

  async processRecord(record) {
    if (!record || !record.reference) {
      logger.warn("Invalid record received:", record);
      return;
    }

    try {
      const existingCase = await db.MerimenCases.findOne({
        where: { merimen_ref: record.reference },
      }).catch((err) => {
        logger.error("Database query error:", err);
        throw new Error("Failed to query database");
      });

      if (existingCase) {
        await this.updateCase(existingCase, record);
      } else {
        await this.createNewCase(record);
      }
    } catch (err) {
      logger.error("Error processing record:", {
        reference: record.reference,
        error: err.message,
      });
      throw err;
    }
  }

  async createNewCase(data) {
    try {
      const newCase = await db.MerimenCases.create({
        merimen_ref: data.reference,
        claim_no: data.claim_number,
        vehicle_no: data.vehicle_number?.toUpperCase(),
        insurer_id: await this.getInsurerId(data.insurer),
        date_of_loss: data.loss_date,
        date_received: moment().format(),
        status: "NEW",
        raw_data: JSON.stringify(data),
        is_processed: false,
        processing_attempts: 0,
      });

      logger.info(`Created new Merimen case: ${data.reference}`);
      return newCase;
    } catch (err) {
      logger.error("Error creating new case:", err);
      throw err;
    }
  }

  async updateCase(existingCase, newData) {
    try {
      await existingCase.update({
        claim_no: newData.claim_number,
        vehicle_no: newData.vehicle_number?.toUpperCase(),
        date_of_loss: newData.loss_date,
        status: "UPDATED",
        raw_data: JSON.stringify(newData),
        processing_attempts: existingCase.processing_attempts + 1,
        last_attempt_at: moment().format(),
      });

      logger.info(`Updated Merimen case: ${newData.reference}`);
    } catch (err) {
      logger.error(`Error updating case ${existingCase.merimen_ref}:`, err);
      throw err;
    }
  }

  async getInsurerId(insurerName) {
    try {
      const insurer = await db.Insurers.findOne({
        where: { name: insurerName },
      });
      return insurer?.id || null;
    } catch (err) {
      logger.error("Error finding insurer:", err);
      return null;
    }
  }

  async markAsProcessed(caseId) {
    try {
      await db.MerimenCases.update(
        { is_processed: true },
        { where: { id: caseId } }
      );
    } catch (err) {
      logger.error(`Error marking case ${caseId} as processed:`, err);
      throw err;
    }
  }
}

// Ensure singleton instance
const instance = new MerimenProcessorService();
module.exports = instance;
