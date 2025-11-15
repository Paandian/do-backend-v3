module.exports = (app) => {
  const router = require("express").Router();
  const closedFiles = require("../controllers/compliance/closedFiles.controller");
  const complianceRatioInsurer = require("../controllers/compliance/complianceRatioInsurer.controller");
  const complianceRatioBranch = require("../controllers/compliance/complianceRatioBranch.controller");
  const outstandingInsurer = require("../controllers/compliance/outstandingInsurer.controller");
  const outstandingBranch = require("../controllers/compliance/outstandingBranch.controller");
  const outstandingDaysInsurer = require("../controllers/compliance/outstandingDaysInsurer.controller");
  const outstandingDaysBranch = require("../controllers/compliance/outstandingDaysBranch.controller");
  const ratioCalculatorInsurer = require("../controllers/compliance/ratioCalculatorInsurer.controller");
  const complianceTable = require("../controllers/compliance/complianceTable.controller");

  // Compliance: Closed Files by Department
  router.get("/closed-files", closedFiles.getClosedFilesComplianceReport);
  router.get(
    "/closed-files/export",
    closedFiles.exportClosedFilesComplianceReport
  );

  // Compliance: Ratio By Insurer
  router.get(
    "/ratio-insurer",
    complianceRatioInsurer.getComplianceRatioInsurer
  );
  router.get(
    "/ratio-insurer/export",
    complianceRatioInsurer.exportComplianceRatioInsurer
  );

  // Compliance: Ratio By Branch
  router.get("/ratio-branch", complianceRatioBranch.getComplianceRatioBranch);
  router.get(
    "/ratio-branch/export",
    complianceRatioBranch.exportComplianceRatioBranch
  );

  // Outstanding Assignment (By Insurer)
  router.get("/outstanding-insurer", outstandingInsurer.getOutstandingInsurer);
  router.get(
    "/outstanding-insurer/export",
    outstandingInsurer.exportOutstandingInsurer
  );

  // Outstanding Assignment (By Branch)
  router.get("/outstanding-branch", outstandingBranch.getOutstandingBranch);
  router.get(
    "/outstanding-branch/export",
    outstandingBranch.exportOutstandingBranch
  );

  // Outstanding Assignment by Days (Insurer)
  router.get(
    "/outstanding-days-insurer",
    outstandingDaysInsurer.getOutstandingDaysInsurer
  );
  router.get(
    "/outstanding-days-insurer/export",
    outstandingDaysInsurer.exportOutstandingDaysInsurer
  );

  // Outstanding Assignment by Days (Branch)
  router.get(
    "/outstanding-days-branch",
    outstandingDaysBranch.getOutstandingDaysBranch
  );
  router.get(
    "/outstanding-days-branch/export",
    outstandingDaysBranch.exportOutstandingDaysBranch
  );

  // Ratio Calculator by Closed Files (Insurer)
  router.get(
    "/ratio-calculator-insurer/export",
    ratioCalculatorInsurer.exportRatioCalculatorInsurer
  );

  // Compliance Table (Full Assignment Ratio)
  router.get("/compliance-table/export", complianceTable.exportComplianceTable);

  app.use("/api/compliance", router);
};
