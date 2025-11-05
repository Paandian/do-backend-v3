module.exports = (app) => {
  const merimen = require("../controllers/merimen.controller.js");
  // const { authJwt } = require("../middleware");
  const router = require("express").Router();

  // Apply authentication middleware to all routes
  // router.use([authJwt.verifyToken]); // Not needed for now as we are not using authentication

  // Create a new Merimen case
  router.post("/", merimen.create);

  // Retrieve all Merimen cases
  router.get("/", merimen.findAll);

  // getStats
  router.get("/getStats", merimen.getStats);

  // getHealth
  router.get("/getHealth", merimen.getHealth);

  // GetQueue
  router.get("/getQueue", merimen.getQueue);

  // Retrieve a single Merimen case by id
  router.get("/:id", merimen.findOne);

  // Process a Merimen case
  router.post("/:id/process", merimen.process);

  // Update Merimen case status
  router.put("/:id/status", merimen.updateStatus);

  // Delete a Merimen case
  router.delete("/:id", merimen.delete);

  // Register routes
  app.use("/api/merimen-cases", router);
};
