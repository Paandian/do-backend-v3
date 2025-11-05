const db = require("../models");
const Stage = db.stages;
const Op = db.Sequelize.Op;

// Create and Save a new Stage
exports.create = (req, res) => {
  // Save Stage to Database
  Stage.create({
    name: req.body.name,
    stageCode: req.body.stageCode,
  })
    .then(() => {
      res.send({ message: "Stage created successfully!" });
    })

    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

// Retrieve all Stages from the database.
exports.findAll = (req, res) => {
  const name = req.query.name;
  var condition = name ? { name: { [Op.like]: `%${name}%` } } : null;

  Stage.findAll({ where: condition })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving Stages.",
      });
    });
};

// Find a single Stage with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Stage.findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Stage with id=" + id,
      });
    });
};

// Update a Stage by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  Stage.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Stage updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update Stage with id=${id}. Maybe Stage is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Stage with id=" + id,
      });
    });
};

// Delete a Stage with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Stage.destroy({
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Stage deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete Stage with id=${id}. Maybe Stage is not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete Stage with id=" + id,
      });
    });
};

// Delete all Stages from the database.
exports.deleteAll = (req, res) => {
  Stage.destroy({
    where: {},
    truncate: false,
  })
    .then((nums) => {
      res.send({ message: `${nums} Stages deleted successfully!` });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all Stages.",
      });
    });
};
