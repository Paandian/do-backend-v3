const db = require("../models");
const subDept = db.subDept;
const Op = db.Sequelize.Op;

// Create and Save a new Sub-Department
exports.create = (req, res) => {
  subDept
    .create({
      deptId: req.body.deptId,
      subCode: req.body.subCode,
      subCodeDesc: req.body.subCodeDesc,
    })
    .then(() => {
      res.send({ message: "Sub-Department created successfully!" });
    })

    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

// Retrieve all Sub-Department from the database.
exports.findAll = (req, res) => {
  const name = req.query.name;
  var condition = name ? { name: { [Op.like]: `%${name}%` } } : null;

  subDept
    .findAll({ where: condition })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving Sub-Department.",
      });
    });
};

// Find a single subDept with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  subDept
    .findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Sub-Department with id=" + id,
      });
    });
};

// Update a Sub-Department by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  subDept
    .update(req.body, {
      where: { id: id },
    })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Sub-Department updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update Sub-Department with id=${id}. Maybe Sub-Department is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Sub-Department with id=" + id,
      });
    });
};

// Delete a Sub-Department with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  subDept
    .destroy({
      where: { id: id },
    })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Sub-Department deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete Sub-Department with id=${id}. Maybe Sub-Department is not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete Sub-Department with id=" + id,
      });
    });
};

// Delete all Sub-Department from the database.
exports.deleteAll = (req, res) => {
  subDept
    .destroy({
      where: {},
      truncate: false,
    })
    .then((nums) => {
      res.send({
        message: `${nums} Sub-Department deleted successfully!`,
      });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message ||
          "Some error occurred while removing all Sub-Department.",
      });
    });
};
