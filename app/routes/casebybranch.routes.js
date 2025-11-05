module.exports = (app) => {
  const casebybranch = require("../controllers/casebybranch.controller");

  var router = require("express").Router();

  // Retrieve all casefiles with branch
  router.get("/:branch", casebybranch.findAllBranch);

  app.use("/api/bybranch", router);
};
