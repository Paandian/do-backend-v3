module.exports = app => {
    const branches = require("../controllers/branch.controller");
  
    var router = require("express").Router();
  
    // Create a new Branch
    router.post("/", branches.create);
  
    // Retrieve all Branchs
    router.get("/", branches.findAll);
  
    // Retrieve all published Branches
    // router.get("/published", branches.findAllPublished);
  
    // Retrieve a single Branch with id
    router.get("/:id", branches.findOne);
  
    // Update a Branch with id
    router.put("/:id", branches.update);
  
    // Delete a Branch with id
    router.delete("/:id", branches.delete);
  
    // Delete all Branches
    router.delete("/", branches.deleteAll);
  
    app.use('/api/branches', router);
  };