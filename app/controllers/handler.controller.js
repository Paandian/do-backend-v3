const db = require("../models");
const Handler = db.handler;
const Op = db.Sequelize.Op;

// Create and Save a new Handler
exports.create = (req, res) => {
  Handler.create({
    insId: req.body.insId,
    deptId: req.body.deptId,
    name: req.body.name,
    offTel: req.body.offTel,
    mobile: req.body.mobile,
    email: req.body.email,
  })
    .then(() => {
      res.send({ message: "Handler created successfully!" });
    })

    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

// Retrieve all Handlers from the database.
exports.findAll = (req, res) => {
  const name = req.query.name;
  var condition = name ? { name: { [Op.like]: `%${name}%` } } : null;

  Handler.findAll({ where: condition })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving Handlers.",
      });
    });
};

// Find a single Handler with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Handler.findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Handler with id=" + id,
      });
    });
};

// Update a Handler by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  Handler.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Handler updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update Handler with id=${id}. Maybe Handler is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Handler with id=" + id,
      });
    });
};

// Delete a Handler with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Handler.destroy({
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Handler deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete Handler with id=${id}. Maybe Handler is not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete Handler with id=" + id,
      });
    });
};

// Delete all Handlers from the database.
exports.deleteAll = (req, res) => {
  Handler.destroy({
    where: {},
    truncate: false,
  })
    .then((nums) => {
      res.send({ message: `${nums} Handlers deleted successfully!` });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all Handlers.",
      });
    });
};
