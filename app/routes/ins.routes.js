module.exports = (app) => {
  const inss = require("../controllers/ins.controller");

  var router = require("express").Router();

  // Create a new Insurer
  router.post("/", inss.create);

  // Retrieve all Insurers
  router.get("/", inss.findAll);

  // Retrieve all published Insurers
  // router.get("/published", inss.findAllPublished);

  // Retrieve a single Insurer with id
  router.get("/:id", inss.findOne);

  // Update a Insurer with id
  router.put("/:id", inss.update);

  // Delete a Insurer with id
  router.delete("/:id", inss.delete);

  // Delete all Insurers
  router.delete("/", inss.deleteAll);

  app.use("/api/inss", router);
};
