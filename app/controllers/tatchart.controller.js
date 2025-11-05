const db = require("../models");
const Tatchart = db.tatchart;
const Op = db.Sequelize.Op;

// Create and Save a new Tatchart
exports.create = (req, res) => {
  Tatchart.create({
    insId: req.body.insId,
    subDeptId: req.body.subDeptId,
    tatAlert: req.body.tatAlert,
    tatMax: req.body.tatMax,
  })
    .then(() => {
      res.send({ message: "Tatchart created successfully!" });
    })

    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

// Retrieve all Tatcharts from the database.
exports.findAll = (req, res) => {
  const name = req.query.name;
  var condition = name ? { name: { [Op.like]: `%${name}%` } } : null;

  Tatchart.findAll({ where: condition })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving Tatcharts.",
      });
    });
};

// Find a single Tatchart with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Tatchart.findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Tatchart with id=" + id,
      });
    });
};

// Update a Tatchart by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  Tatchart.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Tatchart updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update Tatchart with id=${id}. Maybe Tatchart is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Tatchart with id=" + id,
      });
    });
};

// Delete a Tatchart with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Tatchart.destroy({
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Tatchart deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete Tatchart with id=${id}. Maybe Tatchart is not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete Tatchart with id=" + id,
      });
    });
};

// Delete all Tatcharts from the database.
exports.deleteAll = (req, res) => {
  Tatchart.destroy({
    where: {},
    truncate: false,
  })
    .then((nums) => {
      res.send({ message: `${nums} Tatcharts deleted successfully!` });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all Tatcharts.",
      });
    });
};
