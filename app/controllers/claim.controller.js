const db = require("../models");
const claims = db.claims;
const Op = db.Sequelize.Op;

// Create and Save a new Claim
exports.create = (req, res) => {
  claims
    .create({
      caseId: req.body.caseId,
      adjId: req.body.adjId,
      travMileage: req.body.travMileage,
      additional: req.body.additional,
      sdAndStamps: req.body.sdAndStamps,
      medicalReport: req.body.medicalReport,
      policeDoc: req.body.policeDoc,
      jpjDoc: req.body.jpjDoc,
      misc: req.body.misc,
      typing: req.body.typing,
    })
    .then(() => {
      res.send({ message: "Claim created successfully!" });
    })

    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

// Retrieve all Claim from the database.
exports.findAll = (req, res) => {
  const name = req.query.name;
  var condition = name ? { name: { [Op.like]: `%${name}%` } } : null;

  claims
    .findAll({ where: condition })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving Claims.",
      });
    });
};

// Find a single claim with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  claims
    .findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Claim with id=" + id,
      });
    });
};

// Update a Claim by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  claims
    .update(req.body, {
      where: { id: id },
    })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Claim updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update Claim with id=${id}. Maybe Claim is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Claim with id=" + id,
      });
    });
};

// Update all related Claim by the id in the request
exports.updateAll = (req, res) => {
  claims
    .update(req.body, {
      where: {
        caseId: req.params.id,
      },
    })
    .then(() => {
      res.status(200).send({ message: "Claims can be processed now!" });
    })
    .catch((err) => {
      res
        .status(500)
        .send({ message: "Error updating claims status", error: err });
    });
};

// Delete a Claim with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  claims
    .destroy({
      where: { id: id },
    })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Claim deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete Claim with id=${id}. Maybe Claim is not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete Claim with id=" + id,
      });
    });
};

// Delete all Claim from the database.
exports.deleteAll = (req, res) => {
  claims
    .destroy({
      where: {},
      truncate: false,
    })
    .then((nums) => {
      res.send({
        message: `${nums} Claims deleted successfully!`,
      });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all Claims.",
      });
    });
};
