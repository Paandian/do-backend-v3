const db = require("../models");
const Document = db.document;
const Op = db.Sequelize.Op;
const path = require("path");
const fs = require("fs");

// Create and Save a new Document
exports.create = (req, res) => {
  // console.log(req.body);
  Document.create({
    caseId: req.body.caseId,
    docStageId: req.body.docStageId,
    name: req.body.name,
    Type: req.body.Type,
    Remark: req.body.Remark,
    createdBy: req.body.createdBy,
  })
    .then(() => {
      res.send({ message: "Document created successfully!" });
    })

    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

// Retrieve all Documents from the database.
exports.findAll = (req, res) => {
  const name = req.query.name;
  var condition = name ? { name: { [Op.like]: `%${name}%` } } : null;

  Document.findAll({ where: condition })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving Documents.",
      });
    });
};

// Find a single Document with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Document.findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Document with id=" + id,
      });
    });
};

// Update a Document by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  Document.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Document updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update Document with id=${id}. Maybe Document is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Document with id=" + id,
      });
    });
};

// Delete a Document with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;
  const name = req.params.name;
  const directoryPath = path.join(__dirname, "../../../docs/" + name);

  Document.destroy({
    where: { id: id },
  })

    .then((num) => {
      if (num == 1) {
        fs.unlink(directoryPath, (err) => {
          if (err) {
            console.error(err);
            return;
          }
        });
        res.send({
          message: "Document deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete Document with id=${id}. Maybe Document is not found!`,
        });
      }
    })

    // .then((num) => {
    //   if (num == 1)
    //     fs.unlink(directoryPath, (err) => {
    //       if (err) {
    //         console.error(err);
    //         return;
    //       }
    //     });
    // })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete Document with id=" + id,
      });
    });
};

// Delete all Documents from the database.
exports.deleteAll = (req, res) => {
  Document.destroy({
    where: {},
    truncate: false,
  })
    .then((nums) => {
      res.send({ message: `${nums} Documents deleted successfully!` });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all Documents.",
      });
    });
};
