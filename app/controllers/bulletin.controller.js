const db = require("../models");
const Bulletin = db.bulletin;
const Op = db.Sequelize.Op;

// Create and Save a new Bulletin
exports.create = (req, res) => {
  // Save Bulletin to Database
  Bulletin.create({
    newsTitle: req.body.newsTitle,
    newsStory: req.body.newsStory,
    newsAuthor: req.body.newsAuthor,
  })
    .then(() => {
      res.send({ message: "Bulletin created successfully!" });
    })

    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

// Retrieve all bulletins from the database.
exports.findAll = (req, res) => {
  const name = req.query.newsTitle;
  var condition = name ? { name: { [Op.like]: `%${name}%` } } : null;

  Bulletin.findAll({ where: condition })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving bulletins.",
      });
    });
};

// Find a single Bulletin with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Bulletin.findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Bulletin with id=" + id,
      });
    });
};

// Update a Bulletin by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  Bulletin.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Bulletin updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update Bulletin with id=${id}. Maybe Bulletin is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Bulletin with id=" + id,
      });
    });
};

// Delete a Bulletin with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Bulletin.destroy({
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Bulletin deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete Bulletin with id=${id}. Maybe Bulletin is not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete Bulletin with id=" + id,
      });
    });
};

// Delete all Bulletins from the database.
exports.deleteAll = (req, res) => {
  Bulletin.destroy({
    where: {},
    truncate: false,
  })
    .then((nums) => {
      res.send({ message: `${nums} Bulletins deleted successfully!` });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all bulletins.",
      });
    });
};
