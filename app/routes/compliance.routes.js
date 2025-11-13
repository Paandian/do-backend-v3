module.exports = (app) => {
  const compliance = require("../controllers/compliance.controller");
  const router = require("express").Router();

  // Compliance: Closed Files by Department
  router.get("/closed-files", compliance.getClosedFilesComplianceReport);
  router.get(
    "/closed-files/export",
    compliance.exportClosedFilesComplianceReport
  );

  // Compliance: Ratio By Insurer
  router.get("/ratio-insurer", compliance.getComplianceRatioInsurer);
  router.get("/ratio-insurer/export", compliance.exportComplianceRatioInsurer);

  // Compliance: Ratio By Branch
  router.get("/ratio-branch", compliance.getComplianceRatioBranch);
  router.get("/ratio-branch/export", compliance.exportComplianceRatioBranch);

  app.use("/api/compliance", router);
};
