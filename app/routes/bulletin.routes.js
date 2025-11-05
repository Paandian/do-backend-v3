module.exports = (app) => {
  const bulletins = require("../controllers/bulletin.controller");

  var router = require("express").Router();

  // Create a new Branch
  router.post("/", bulletins.create);

  // Retrieve all Branchs
  router.get("/", bulletins.findAll);

  // Retrieve all pinned Bulletins
  // router.get("/pinned", bulletins.findAllPublished);

  // Retrieve a single Branch with id
  router.get("/:id", bulletins.findOne);

  // Update a Branch with id
  router.put("/:id", bulletins.update);

  // Delete a Branch with id
  router.delete("/:id", bulletins.delete);

  // Delete all Branches
  router.delete("/", bulletins.deleteAll);

  app.use("/api/bulletins", router);
};
