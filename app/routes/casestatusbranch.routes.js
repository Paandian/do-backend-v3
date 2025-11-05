module.exports = (app) => {
  const casestatusbranch = require("../controllers/casestatusbranch.controller");

  var router = require("express").Router();

  // Retrieve all casefiles with fileStatus and depts
  router.get("/:fileStatus/:branch", casestatusbranch.findAllStatusBranch);

  app.use("/api/detailByBranch", router);
};
