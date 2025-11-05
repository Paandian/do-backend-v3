module.exports = (app) => {
  const transfers = require("../controllers/transfer.controller");

  var router = require("express").Router();

  // Create a new Handler
  router.post("/", transfers.create);

  // Retrieve all transfers
  router.get("/", transfers.findAll);

  // Retrieve all published transfers
  // router.get("/published", transfers.findAllPublished);

  // Retrieve a single Handler with id
  router.get("/:id", transfers.findOne);

  // Update a Handler with id
  router.put("/:id", transfers.update);

  // Delete a Handler with id
  router.delete("/:id", transfers.delete);

  // Delete all transfers
  router.delete("/", transfers.deleteAll);

  app.use("/api/transfers", router);
};
