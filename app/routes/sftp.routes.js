module.exports = (app) => {
  const sftp = require("../controllers/sftp.controller");
  const router = require("express").Router();

  router.get("/test", sftp.testConnection);
  router.get("/status", sftp.getStatus);

  app.use("/api/sftp", router);
};
