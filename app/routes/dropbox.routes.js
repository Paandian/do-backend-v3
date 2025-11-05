// const { authJwt } = require("../middleware");
module.exports = (app) => {
  const dropboxfiles = require("../controllers/dropbox.controller");
  const excelController = require("../controllers/excel.controller");
  const upload = require("../middleware/uploadExcel");

  var router = require("express").Router();

  // Create a new Dropbox File
  router.post("/", dropboxfiles.create);

  // Retrieve all dropboxfiles
  router.get("/", dropboxfiles.findAll);

  // Retrieve all Incoming dropboxfiles
  router.get("/incoming", dropboxfiles.findInc);

  // Retrieve all Incoming dropboxfiles
  router.get("/cancelled", dropboxfiles.findCanc);

  // Retrieve a single Dropbox File with id
  router.get("/:id", dropboxfiles.findOne);

  // Update a Dropbox File with id
  router.put("/:id", dropboxfiles.update);

  // Delete a Dropbox File with id
  router.delete("/:id", dropboxfiles.delete);

  // Delete a Dropbox File with ids
  router.delete("/delete/selected", dropboxfiles.deleteSelected);

  // Delete all dropboxfiles
  // router.delete("/", dropboxfiles.deleteAll);

  router.post("/upload", upload.single("file"), excelController.upload);
  router.get("/excelfiles", excelController.getCasefiles);

  // app.use("/api/dropboxfiles", [authJwt.verifyToken], router);
  app.use("/api/dropboxfiles", router);
};
