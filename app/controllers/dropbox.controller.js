const db = require("../models");
const Dropbox = db.dropboxes;
const Op = db.Sequelize.Op;

// Create and Save a new Dropbox File
exports.create = (req, res) => {
  // Save Dropbox File to Database
  Dropbox.create({
    fileStatus: req.body.fileStatus,
    refType: req.body.refType,
    subRefType: req.body.subRefType,
    insurer: req.body.insurer,
    claimNo: req.body.claimNo,
    vehicleNo: req.body.vehicleNo,
    dateOfAssign: req.body.dateOfAssign,
    dateOfLoss: req.body.dateOfLoss,
  })
    .then(() => {
      res.send({ message: "Dropbox File is created successfully!" });
    })

    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

// Retrieve all Dropbox Files from the database.
exports.findAll = (req, res) => {
  const insuredName = req.query.insuredName;
  var condition = insuredName
    ? { insuredName: { [Op.like]: `%${insuredName}%` } }
    : null;

  Dropbox.findAll({ where: condition })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving Dropbox Files.",
      });
    });
};

// Find all Incoming Files
exports.findInc = (req, res) => {
  Dropbox.findAll({ where: { fileStatus: "INC" } })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message ||
          "Some error occurred while retrieving Incoming Dropbox Files.",
      });
    });
};

// Find all Cancelled Files
exports.findCanc = (req, res) => {
  Dropbox.findAll({ where: { fileStatus: "CINC" } })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message ||
          "Some error occurred while retrieving Cancelled Dropbox Files.",
      });
    });
};

// Find a single Dropbox File with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Dropbox.findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Dropbox File with id=" + id,
      });
    });
};

// Update a Dropbox File by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  Dropbox.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Dropbox File updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update Dropbox File with id=${id}. Maybe Dropbox File is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Dropbox File with id=" + id,
      });
    });
};

// Delete a Dropbox File with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Dropbox.destroy({
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Dropbox File deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete Dropbox File with id=${id}. Maybe Dropbox File is not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete Dropbox File with id=" + id,
      });
    });
};

//Delete a collection of dropboxes
exports.deleteSelected = (req, res) => {
  const ids = req.body.ids; // get the ids from the request body

  Dropbox.destroy({
    where: {
      id: ids,
    },
  })
    .then(() => {
      res
        .status(200)
        .send({ message: "Dropbox File(s) deleted successfully!" });
    })
    .catch((err) => {
      res
        .status(500)
        .send({ message: "Error deleting Dropbox File(s)", error: err });
    });
};

// Delete all Dropbox Files from the database.
// exports.deleteAll = (req, res) => {
//   Dropbox.destroy({
//     where: {},
//     truncate: false,
//   })
//     .then((nums) => {
//       res.send({ message: `${nums} Dropbox Files were deleted successfully!` });
//     })
//     .catch((err) => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while removing all Dropbox Files.",
//       });
//     });
// };
