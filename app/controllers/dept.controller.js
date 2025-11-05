const db = require("../models");
const Dept = db.dept;
const Op = db.Sequelize.Op;

// Create and Save a new Department
exports.create = (req, res) => {
  // Save Department to Database
  Dept.create({
    name: req.body.name,
    description: req.body.description,
    picID: req.body.picID,
  })
    .then(() => {
      res.send({ message: "Department created successfully!" });
    })

    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

// Retrieve all departments from the database.
exports.findAll = (req, res) => {
  const name = req.query.name;
  var condition = name ? { name: { [Op.like]: `%${name}%` } } : null;

  Dept.findAll({
    where: condition,
    order: [
      // ["id", "DESC"],
      ["name", "ASC"],
    ],
  })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving departments.",
      });
    });
};

// Find a single Department with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Dept.findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Department with id=" + id,
      });
    });
};

// Update a Department by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;
  console.log(req.body);

  Dept.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Department updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update Department with id=${id}. Maybe Department is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Department with id=" + id,
      });
    });
};

// Delete a Department with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Dept.destroy({
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Department deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete Department with id=${id}. Maybe Department is not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete Department with id=" + id,
      });
    });
};

// Delete all Departments from the database.
exports.deleteAll = (req, res) => {
  Dept.destroy({
    where: {},
    truncate: false,
  })
    .then((nums) => {
      res.send({ message: `${nums} Departments deleted successfully!` });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all Departments.",
      });
    });
};
