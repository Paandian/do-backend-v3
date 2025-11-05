module.exports = (app) => {
  const states = require("../controllers/state.controller");

  var router = require("express").Router();

  // Create a new Branch
  router.post("/", states.create);

  // Retrieve all Branchs
  router.get("/", states.findAll);

  // Retrieve all published states
  // router.get("/published", states.findAllPublished);

  // Retrieve a single Branch with id
  router.get("/:id", states.findOne);

  // Update a Branch with id
  router.put("/:id", states.update);

  // Delete a Branch with id
  router.delete("/:id", states.delete);

  // Delete all states
  router.delete("/", states.deleteAll);

  app.use("/api/states", router);
};
