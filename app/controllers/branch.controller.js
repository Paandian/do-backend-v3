const db = require("../models");
const Branch = db.branch;
const Op = db.Sequelize.Op;

// Create and Save a new Branch
exports.create = (req, res) => {
  // Save Branch to Database
  Branch.create({
    name: req.body.name,
    brCode: req.body.brCode,
  })
    .then(() => {
      res.send({ message: "Branch created successfully!" });
    })

    // .then(member => {
    //   if (req.body.roles) {
    //     Role.findAll({
    //       where: {
    //         name: {
    //           [Op.or]: req.body.roles
    //         }
    //       }
    //     }).then(roles => {
    //       member.setRoles(roles).then(() => {
    //         res.send({ message: "Member was created successfully!" });
    //       });
    //     });
    //   } else {
    //     // member role = 1
    //     member.setRoles([9]).then(() => {
    //       res.send({ message: "Member was created successfully!" });
    //     });
    //   }
    // })
    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

// exports.create = (req, res) => {
//     // Validate request
//     if (!req.body.name) {
//       res.status(400).send({
//         message: "Content can not be empty!"
//       });
//       return;
//     }

//     // Create a Branch
//     const branch = {
//       name: req.body.name,
//       brCode: req.body.brCode,
//     };

//     // Save Branch in the database
//     Branch.create(branch)
//       .then(data => {
//         res.send(data);
//       })
//       .catch(err => {
//         res.status(500).send({
//           message:
//             err.message || "Some error occurred while creating the Branch."
//         });
//       });
//   };

// Retrieve all branches from the database.
exports.findAll = (req, res) => {
  const name = req.query.name;
  var condition = name ? { name: { [Op.like]: `%${name}%` } } : null;

  Branch.findAll({ where: condition })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving branches.",
      });
    });
};

// Find a single Branch with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Branch.findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Branch with id=" + id,
      });
    });
};

// Update a Branch by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  Branch.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Branch updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update Branch with id=${id}. Maybe Branch is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Branch with id=" + id,
      });
    });
};

// Delete a Branch with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Branch.destroy({
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Branch deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete Branch with id=${id}. Maybe Branch is not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete Branch with id=" + id,
      });
    });
};

// Delete all Branches from the database.
exports.deleteAll = (req, res) => {
  Branch.destroy({
    where: {},
    truncate: false,
  })
    .then((nums) => {
      res.send({ message: `${nums} Branches deleted successfully!` });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all branches.",
      });
    });
};
