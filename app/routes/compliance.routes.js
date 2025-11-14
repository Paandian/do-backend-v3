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

  // Outstanding Assignment (By Insurer)
  router.get("/outstanding-insurer", compliance.getOutstandingInsurer);
  router.get(
    "/outstanding-insurer/export",
    compliance.exportOutstandingInsurer
  );

  // Outstanding Assignment (By Branch)
  router.get("/outstanding-branch", compliance.getOutstandingBranch);
  router.get("/outstanding-branch/export", compliance.exportOutstandingBranch);

  // Outstanding Assignment by Days (Insurer)
  router.get("/outstanding-days-insurer", compliance.getOutstandingDaysInsurer);
  router.get(
    "/outstanding-days-insurer/export",
    compliance.exportOutstandingDaysInsurer
  );

  app.use("/api/compliance", router);
};
