module.exports = (app) => {
  const casestatusref = require("../controllers/casestatusref.controller");

  var router = require("express").Router();

  // Retrieve all casefiles with fileStatus and depts
  router.get("/:fileStatus/:refType", casestatusref.findAllStatusRefType);

  app.use("/api/detailByRef", router);
};
