module.exports = (app) => {
  const controller = require("../controllers/file.controller");

  var router = require("express").Router();

  router.post("/api/members/upload", controller.upload);
  router.get("/files", controller.getListFiles);
  // router.get("/files/:name", controller.download);
  app.use(router);
};
