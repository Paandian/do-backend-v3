module.exports = (app) => {
  const casebyreftype = require("../controllers/casebyreftype.controller");

  var router = require("express").Router();

  // Retrieve all casefiles with branch
  router.get("/:refType", casebyreftype.findAllRefType);

  app.use("/api/byref", router);
};
