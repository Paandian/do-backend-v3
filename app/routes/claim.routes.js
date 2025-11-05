module.exports = (app) => {
  const claims = require("../controllers/claim.controller");

  var router = require("express").Router();

  // Create a new Claim
  router.post("/", claims.create);

  // Retrieve all claims
  router.get("/", claims.findAll);

  // Retrieve a single Claim with id
  router.get("/:id", claims.findOne);

  // Update a Claim with id
  router.put("/:id", claims.update);

  // Update bulk Claim with id
  router.put("/items/:id", claims.updateAll);

  // Delete a Claim with id
  router.delete("/:id", claims.delete);

  // Delete all Claims
  router.delete("/", claims.deleteAll);

  app.use("/api/claims", router);
};
