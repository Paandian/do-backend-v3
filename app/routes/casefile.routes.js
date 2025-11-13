// const { authJwt } = require("../middleware");
module.exports = (app) => {
  const casefiles = require("../controllers/casefile.controller");

  var router = require("express").Router();

  // Create a new casefile
  router.post("/", casefiles.create);

  // Retrieve paginated casefiles (including Excel export)
  router.get("/paginated", casefiles.findPaginated);

  // Retrieve paginated active casefiles (not CANC or CLO)
  router.get("/paginated-active", casefiles.findPaginatedActive);

  // Retrieve paginated closed/cancelled casefiles (CANC or CLO)
  router.get("/paginated-closed", casefiles.findPaginatedClosed);

  // Retrieve all casefiles
  router.get("/", async (req, res) => {
    try {
      const result = await casefiles.findAll(req, res);
      return result;
    } catch (err) {
      console.error("Error in /api/casefiles:", err);
      return res.status(500).json({
        message:
          err.message || "Some error occurred while retrieving casefiles.",
      });
    }
  });

  // Retrieve all casefiles with refType
  // router.get("/:refType", casefiles.findAllRefType);

  // Retrieve all casefiles with branch
  // router.get("/:branch", casefiles.findAllBranch);

  // Retrieve a single casefile with id
  router.get("/:id", casefiles.findOne);

  // Update a casefile with id
  router.put("/:id", casefiles.update);

  // Delete a casefile with id
  router.delete("/:id", casefiles.delete);

  // Delete all casefiles
  // router.delete("/", casefiles.deleteAll);

  // Compliance: Closed Files by Department
  router.get(
    "/compliance/closed-files",
    casefiles.getClosedFilesComplianceReport
  );
  router.get(
    "/compliance/closed-files/export",
    casefiles.exportClosedFilesComplianceReport
  );

  // Compliance: Ratio By Insurer
  router.get("/compliance/ratio-insurer", casefiles.getComplianceRatioInsurer);
  router.get(
    "/compliance/ratio-insurer/export",
    casefiles.exportComplianceRatioInsurer
  );

  // app.use("/api/casefiles", [authJwt.verifyToken], router);
  app.use("/api/casefiles", router);
};
