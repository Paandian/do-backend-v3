module.exports = (app) => {
  const depts = require("../controllers/dept.controller");

  var router = require("express").Router();

  // Create a new Department
  router.post("/", depts.create);

  // Retrieve all Departments
  router.get("/", depts.findAll);

  // Retrieve a single Department with id
  router.get("/:id", depts.findOne);

  // Update a Department with id
  router.put("/:id", depts.update);

  // Delete a Department with id
  router.delete("/:id", depts.delete);

  // Delete all Departments
  router.delete("/", depts.deleteAll);

  app.use("/api/depts", router);
};
