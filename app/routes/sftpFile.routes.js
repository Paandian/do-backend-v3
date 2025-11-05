const { authJwt } = require("../middleware");
const controller = require("../controllers/sftpFile.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Get files list by location
  app.get("/api/sftp-files", [authJwt.verifyToken], controller.listFiles);

  // Get file statistics
  app.get(
    "/api/sftp-files/stats",
    [authJwt.verifyToken],
    controller.getFileStats
  );
};
