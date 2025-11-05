const db = require("../models");
const MerimenCase = db.MerimenCase;
const Op = db.Sequelize.Op;
const MerimenSftpService = require("../services/MerimenSftpService");
// const MerimenSftpService = require("../services/MerimenSftpServiceSimulation");
// const MerimenSftpService = require("../services/MerimenBasicftpService");
const logger = require("../utils/logger");
const moment = require("moment");
const diskspace = require("diskspace");

// Create and Save a new Merimen Case
exports.create = async (req, res) => {
  try {
    const merimenCase = await MerimenCase.create(req.body);
    logger.info(`Created new Merimen case: ${merimenCase.merimen_ref}`);
    res.send(merimenCase);
  } catch (err) {
    logger.error("Error creating Merimen case:", err);
    res.status(500).send({
      message: err.message || "Error creating Merimen case",
    });
  }
};

// Retrieve all Merimen Cases
exports.findAll = async (req, res) => {
  const { status, vehicle_no } = req.query;
  const condition = {};

  if (status) {
    condition.status = status;
  }
  if (vehicle_no) {
    condition.vehicle_no = { [Op.like]: `%${vehicle_no}%` };
  }

  try {
    const cases = await MerimenCase.findAll({
      where: condition,
      include: [
        {
          model: db.inss,
          as: "insurer",
          attributes: ["name"],
        },
      ],
      order: [["date_received", "DESC"]],
    });
    res.send(cases);
  } catch (err) {
    logger.error("Error retrieving Merimen cases:", err);
    res.status(500).send({
      message: err.message || "Error retrieving Merimen cases",
    });
  }
};

// Find a single Merimen Case
exports.findOne = async (req, res) => {
  const id = req.params.id;
  try {
    const merimenCase = await MerimenCase.findByPk(id, {
      include: [
        {
          model: db.inss,
          as: "insurer",
          attributes: ["name"],
        },
      ],
    });
    if (!merimenCase) {
      return res.status(404).send({ message: "Case not found" });
    }
    res.send(merimenCase);
  } catch (err) {
    logger.error(`Error retrieving Merimen case ${id}:`, err);
    res.status(500).send({
      message: `Error retrieving case with id ${id}`,
    });
  }
};

// Process a Merimen Case
exports.process = async (req, res) => {
  const id = req.params.id;
  try {
    const merimenCase = await MerimenCase.findByPk(id);
    if (!merimenCase) {
      return res.status(404).send({ message: "Case not found" });
    }

    await merimenCase.update({
      is_processed: true,
      status: "PROCESSED",
      processing_attempts: merimenCase.processing_attempts + 1,
      last_attempt_at: new Date(),
    });

    logger.info(`Processed Merimen case: ${merimenCase.merimen_ref}`);
    res.send({ message: "Case processed successfully" });
  } catch (err) {
    logger.error(`Error processing Merimen case ${id}:`, err);
    res.status(500).send({
      message: `Error processing case with id ${id}`,
    });
  }
};

// Update Merimen Case status
exports.updateStatus = async (req, res) => {
  const id = req.params.id;
  try {
    const merimenCase = await MerimenCase.findByPk(id);
    if (!merimenCase) {
      return res.status(404).send({ message: "Case not found" });
    }

    await merimenCase.update({
      status: req.body.status,
      error_message: req.body.error_message,
    });

    logger.info(`Updated status for Merimen case: ${merimenCase.merimen_ref}`);
    res.send({ message: "Case status updated successfully" });
  } catch (err) {
    logger.error(`Error updating Merimen case ${id} status:`, err);
    res.status(500).send({
      message: `Error updating case status`,
    });
  }
};

// Delete a Merimen Case
exports.delete = async (req, res) => {
  const id = req.params.id;
  try {
    const result = await MerimenCase.destroy({
      where: { id: id },
    });

    if (result !== 1) {
      return res.status(404).send({
        message: "Case not found",
      });
    }

    logger.info(`Deleted Merimen case with id: ${id}`);
    res.send({ message: "Case deleted successfully" });
  } catch (err) {
    logger.error(`Error deleting Merimen case ${id}:`, err);
    res.status(500).send({
      message: `Error deleting case`,
    });
  }
};

// Get processing statistics
exports.getStats = async (req, res) => {
  try {
    const today = moment().startOf("day");
    const yesterday = moment().subtract(1, "days").startOf("day");
    // Get today's stats
    const todayStats = await MerimenCase.findAndCountAll({
      where: {
        created_at: {
          [Op.between]: [today.format(), moment().format()],
        },
      },
    });
    // Get success rate
    const totalProcessed = await MerimenCase.count({
      where: {
        last_attempt_at: {
          [Op.between]: [yesterday.format(), moment().format()],
        },
        is_processed: true,
      },
    });
    const totalCases = await MerimenCase.count({
      where: {
        created_at: {
          [Op.between]: [yesterday.format(), moment().format()],
        },
      },
    });
    const successRate = totalCases
      ? Math.round((totalProcessed / totalCases) * 100)
      : 0;

    res.send({
      successRate,
      filesProcessedToday: todayStats.count,
      totalProcessed: totalProcessed,
    });
  } catch (err) {
    logger.error("Error getting stats:", err);
    res.status(500).send({
      message: "Error retrieving statistics",
    });
  }
};

// Get system health status
exports.getHealth = async (req, res) => {
  try {
    // Check SFTP connection
    const sftpStatus = await MerimenSftpService.testConnection();

    const path = require("path");
    const rootPath = path.resolve("/"); // Gets absolute root path for current OS

    // Check disk space
    diskspace.check(rootPath, (err, space) => {
      const diskSpaceAvailable = space
        ? Math.round((space.free / space.total) * 100)
        : 0;
      const status =
        sftpStatus && diskSpaceAvailable > 10 ? "healthy" : "unhealthy";

      res.send({
        status,
        sftp: sftpStatus,
        diskSpace: diskSpaceAvailable,
        lastChecked: moment().format(),
      });
    });
  } catch (err) {
    logger.error("Error checking health:", err);
    res.status(500).send({
      message: "Error checking system health",
    });
  }
};

// Get processing queue
exports.getQueue = async (req, res) => {
  try {
    const queuedFiles = await MerimenCase.findAll({
      where: {
        is_processed: false,
        processing_attempts: {
          [Op.lt]: 3,
        },
      },
      order: [["date_received", "ASC"]],
      limit: 10,
    });
    res.send(
      queuedFiles.map((file) => ({
        name: file.merimen_ref,
        size: file.raw_data
          ? Buffer.byteLength(JSON.stringify(file.raw_data))
          : 0,
        received: moment(file.date_received).fromNow(),
        status: file.status,
      }))
    );
  } catch (err) {
    logger.error("Error getting queue:", err);
    res.status(500).send({
      message: "Error retrieving queue",
    });
  }
};
