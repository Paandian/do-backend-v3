module.exports = function (app) {
  const controller = require("../controllers/transporter.controller");

  // ...existing routes...

  // Test endpoint for TAT alerts
  app.get("/api/test/tatalerts", controller.testTatAlerts);
};
