module.exports = (app) => {
  const subDepts = require("../controllers/subDept.controller");

  var router = require("express").Router();

  // Create a new Sub-Department
  router.post("/", subDepts.create);

  // Retrieve all subDepts
  router.get("/", subDepts.findAll);

  // Retrieve a single Sub-Department with id
  router.get("/:id", subDepts.findOne);

  // Update a Sub-Department with id
  router.put("/:id", subDepts.update);

  // Delete a Sub-Department with id
  router.delete("/:id", subDepts.delete);

  // Delete all Sub-Department
  router.delete("/", subDepts.deleteAll);

  app.use("/api/subDepts", router);
};
