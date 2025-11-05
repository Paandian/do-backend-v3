module.exports = (app) => {
  const handlers = require("../controllers/handler.controller");

  var router = require("express").Router();

  // Create a new Handler
  router.post("/", handlers.create);

  // Retrieve all Handlers
  router.get("/", handlers.findAll);

  // Retrieve all published Handlers
  // router.get("/published", handlers.findAllPublished);

  // Retrieve a single Handler with id
  router.get("/:id", handlers.findOne);

  // Update a Handler with id
  router.put("/:id", handlers.update);

  // Delete a Handler with id
  router.delete("/:id", handlers.delete);

  // Delete all Handlers
  router.delete("/", handlers.deleteAll);

  app.use("/api/handlers", router);
};
