module.exports = (app) => {
  const tatcharts = require("../controllers/tatchart.controller");

  var router = require("express").Router();

  // Create a new TatChart
  router.post("/", tatcharts.create);

  // Retrieve all Tatcharts
  router.get("/", tatcharts.findAll);

  // Retrieve a single TatChart with id
  router.get("/:id", tatcharts.findOne);

  // Update a TatChart with id
  router.put("/:id", tatcharts.update);

  // Delete a TatChart with id
  router.delete("/:id", tatcharts.delete);

  // Delete all Tatcharts
  router.delete("/", tatcharts.deleteAll);

  app.use("/api/tatcharts", router);
};
