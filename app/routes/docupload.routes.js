module.exports = (app) => {
  const controller = require("../controllers/doc.controller");

  var router = require("express").Router();

  router.post("/api/docs/upload", controller.upload);
  router.get("/docs", controller.getListFiles);
  router.get("/docs/:name", controller.download);
  app.use(router);
};
