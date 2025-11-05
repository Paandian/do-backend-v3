const db = require("../models");
const State = db.state;
const Op = db.Sequelize.Op;

// Create and Save a new State
exports.create = (req, res) => {
  // Save State to Database
  State.create({
    name: req.body.name,
    stCode: req.body.stCode,
  })
    .then(() => {
      res.send({ message: "State created successfully!" });
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

//     // Create a State
//     const state = {
//       name: req.body.name,
//       brCode: req.body.brCode,
//     };

//     // Save State in the database
//     State.create(state)
//       .then(data => {
//         res.send(data);
//       })
//       .catch(err => {
//         res.status(500).send({
//           message:
//             err.message || "Some error occurred while creating the State."
//         });
//       });
//   };

// Retrieve all states from the database.
exports.findAll = (req, res) => {
  const name = req.query.name;
  var condition = name ? { name: { [Op.like]: `%${name}%` } } : null;

  State.findAll({ where: condition })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving states.",
      });
    });
};

// Find a single State with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  State.findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving State with id=" + id,
      });
    });
};

// Update a State by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  State.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "State updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update State with id=${id}. Maybe State is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating State with id=" + id,
      });
    });
};

// Delete a State with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  State.destroy({
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "State deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete State with id=${id}. Maybe State is not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete State with id=" + id,
      });
    });
};

// Delete all States from the database.
exports.deleteAll = (req, res) => {
  State.destroy({
    where: {},
    truncate: false,
  })
    .then((nums) => {
      res.send({ message: `${nums} States deleted successfully!` });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all states.",
      });
    });
};
