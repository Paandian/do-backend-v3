const db = require("../models");
const Transfer = db.transfer;
const Op = db.Sequelize.Op;

// Create and Save a new Transfer
exports.create = (req, res) => {
  Transfer.create({
    caseId: req.body.caseId,
    branchId: req.body.branchId,
    createdBy: req.body.createdBy,
  })
    .then(() => {
      res.send({ message: "Assignment transfered successfully!" });
    })

    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

// Retrieve all Transfers from the database.
exports.findAll = (req, res) => {
  const name = req.query.name;
  var condition = name ? { name: { [Op.like]: `%${name}%` } } : null;

  Transfer.findAll({ where: condition })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving Transfers.",
      });
    });
};

// Find a single Transfer with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Transfer.findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Transfer with id=" + id,
      });
    });
};

// Update a Transfer by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  Transfer.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Transfer details updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update Transfer with id=${id}. Maybe Transfer is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Transfer with id=" + id,
      });
    });
};

// Delete a Transfer with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Transfer.destroy({
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Transfer deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete Transfer with id=${id}. Maybe Transfer is not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete Transfer with id=" + id,
      });
    });
};

// Delete all Transfers from the database.
exports.deleteAll = (req, res) => {
  Transfer.destroy({
    where: {},
    truncate: false,
  })
    .then((nums) => {
      res.send({ message: `${nums} Transfers deleted successfully!` });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all Transfers.",
      });
    });
};
