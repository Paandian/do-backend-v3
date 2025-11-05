module.exports = (app) => {
  const access = require("../controllers/access.controller");

  var router = require("express").Router();

  // Create a new Access
  router.post("/", access.create);

  // Retrieve all Access
  router.get("/", access.findAll);

  // Retrieve all published Access
  // router.get("/published", access.findAllPublished);

  // Retrieve a single Access with id
  router.get("/:id", access.findOne);

  // Update a Access with id
  router.put("/:id", access.update);

  // Delete a Access with id
  router.delete("/:id", access.delete);

  // Delete all Access
  router.delete("/", access.deleteAll);

  app.use("/api/access", router);
};
