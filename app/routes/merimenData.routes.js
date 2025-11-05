const { authJwt } = require("../middleware");
const controller = require("../controllers/merimenData.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Create a new MerimenData
  app.post(
    "/api/merimenData",
    // [authJwt.verifyToken],
    controller.create
  );

  // Retrieve all MerimenData
  app.get(
    "/api/merimenData",
    // [authJwt.verifyToken],
    controller.findAll
  );

  // Retrieve a single MerimenData with id
  app.get(
    "/api/merimenData/:id",
    // [authJwt.verifyToken],
    controller.findOne
  );

  // Update a single MerimenData with id
  app.put(
    "/api/merimenData/:id",
    // [authJwt.verifyToken],
    controller.update
  );

  // Update MerimenData status
  app.put(
    "/api/merimenData/:id/status",
    // [authJwt.verifyToken],
    controller.updateStatus
  );

  // Delete a MerimenData with id
  app.delete(
    "/api/merimenData/:id",
    // [authJwt.verifyToken],
    controller.delete
  );

  // Bulk delete MerimenData
  app.delete(
    "/api/merimenData/batch/delete",
    // [authJwt.verifyToken],
    controller.bulkDelete
  );

  // Bulk update MerimenData status
  app.put(
    "/api/merimenData/bulk/status",
    // [authJwt.verifyToken],
    controller.bulkUpdateStatus
  );
};
