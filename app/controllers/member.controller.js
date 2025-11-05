// const fs = require("fs");
const db = require("../models");
// const config = require("../config/auth.config");
// const { user: Member, role: Role } = db;
const Member = db.user;
const Role = db.role;
const Dept = db.dept;
const Branch = db.branch;
const user_roles = db.userRoles;
const user_depts = db.userDepts;
const user_branches = db.userBranches;
const Op = db.Sequelize.Op;

const sendEmail = require("../controllers/transporter.controller");

// var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const { role } = require("../models");
const { dept } = require("../models");
const { branch } = require("../models");

// Create and Save a new member
// exports.create = (req, res) => {
//     // Validate request
//     if (!req.body.username) {
//       res.status(400).send({
//         message: "Content can not be empty!"
//       });
//       return;
//     }

//     // Create a Member
//     const member = {
//       username: req.body.username,
//       email: req.body.email
//       // published: req.body.published ? req.body.published : false
//     };

//     // Save Member in the database
//     Member.create(member)
//       .then(data => {
//         res.send(data);
//       })
//       .catch(err => {
//         res.status(500).send({
//           message:
//             err.message || "Some error occurred while creating the Member."
//         });
//       });
//   };
exports.create = (req, res) => {
  var resetlink = Math.floor(100000 + Math.random() * 900000);

  // Save User to Database
  Member.create({
    username: req.body.username,
    fullname: req.body.fullname,
    nric: req.body.nric,
    email: req.body.email,
    telnumber: req.body.telnumber,
    datejoined: req.body.datejoined,
    position: req.body.position,
    empid: req.body.empid,
    usercode: req.body.usercode,
    address: req.body.address,
    emcontactname: req.body.emcontactname,
    emcontactno: req.body.emcontactno,
    // password: bcrypt.hashSync(req.body.password, 8),
    // active: req.body.active,
    active: req.body.active ? req.body.active : 0,
    roles: req.body.roles,
    branches: req.body.branches,
    depts: req.body.depts,
    resetlink: resetlink,
  })

    .then((member) => {
      console.log(member.resetlink);
      console.log(member.email);
      if (req.body.roles) {
        Role.findAll({ where: { id: { [Op.or]: req.body.roles } } }).then(
          (roles) => {
            member.setRoles(roles).then(() => {
              if (req.body.depts) {
                Dept.findAll({
                  where: { id: { [Op.or]: req.body.depts } },
                }).then((depts) => {
                  member.setDepts(depts).then(() => {
                    if (req.body.branches) {
                      Branch.findAll({
                        where: { id: { [Op.or]: req.body.branches } },
                      }).then((branches) => {
                        member.setBranches(branches).then(() => {
                          res.send({
                            message: "Member created successfully!",
                          });
                        });
                      });
                    }

                    // else {
                    //   member.setBranches([1]).then(() => {
                    //     res.send({
                    //       message: "Member created successfully!",
                    //     });
                    //   });
                    // }
                  });
                });
              }

              // else {
              //   member.setDepts([1]).then(() => {
              //     res.send({ message: "Member created successfully!" });
              //   });
              // }
            });
          }
        );
      }

      // else {
      //   member.setRoles([1]).then(() => {
      //     res.send({ message: "Member created successfully!" });
      //   });
      // }
      var data = {
        resetlink: member.resetlink,
        email: member.email,
      };

      sendEmail.sendActivation(data);
      // setTimeout(() => {
      res.send({
        message:
          "User Created Successfully! Activation Link and Token sent to user for further action.",
      });
      // }, 1500);
    })

    // .then((member) => {
    //   var data = {
    //     resetlink: member.resetlink,
    //     email: member.email,
    //   };
    //   sendEmail.sendActivation(data);
    //   setTimeout(() => {
    //     res.send({
    //       message: "Activation Link and Token sent to user for further action.",
    //     });
    //   }, 1500);
    // })

    .catch((err) => {
      res.status(500).send({ message: err.message });
      console.log(err);
    });
};

// Update a Member by the id in the request
exports.updateMember = (req, res) => {
  const id = req.params.id;
  Member.update(
    {
      username: req.body.username,
      fullname: req.body.fullname,
      nric: req.body.nric,
      email: req.body.email,
      telnumber: req.body.telnumber,
      datejoined: req.body.datejoined,
      position: req.body.position,
      empid: req.body.empid,
      usercode: req.body.usercode,
      address: req.body.address,
      emcontactname: req.body.emcontactname,
      emcontactno: req.body.emcontactno,
      active: req.body.active,
      roles: req.body.roles,
      branches: req.body.branches,
      depts: req.body.depts,
      profile: req.body.profile,
    },
    {
      where: { id: id },
    }
  )
    .then(() => {
      return Member.findByPk(id);
    })

    .then((member) => {
      if (req.body.roles.toString().length > 0) {
        Role.findAll({ where: { id: { [Op.or]: req.body.roles } } }).then(
          (roles) => {
            member.setRoles(roles);
          }
        );
      } else {
        user_roles.destroy({
          where: { userId: id },
        });
      }
    })

    .then(() => {
      return Member.findByPk(id);
    })

    .then((member) => {
      if (req.body.branches.length > 0) {
        Branch.findAll({
          where: { id: { [Op.or]: req.body.branches } },
        }).then((branches) => {
          member.setBranches(branches);
        });
      } else {
        user_branches.destroy({
          where: { userId: id },
        });
      }
    })

    .then(() => {
      return Member.findByPk(id);
    })

    .then((member) => {
      if (req.body.depts.length > 0) {
        Dept.findAll({
          where: { id: { [Op.or]: req.body.depts } },
        }).then((depts) => {
          member.setDepts(depts);
        });
      } else {
        user_depts.destroy({
          where: { userId: id },
        });
      }
    })

    .then(() => {
      res.send({
        message: "Member updated successfully!",
      });
    })

    .catch((err) => {
      res.status(500).send({
        message: "Error updating Member with id=" + id + err,
      });
    });
};
// Update a Member profile Details by the id in the request
exports.updateProfile = (req, res) => {
  const id = req.params.id;
  Member.update(
    {
      fullname: req.body.fullname,
      nric: req.body.nric,
      telnumber: req.body.telnumber,
      address: req.body.address,
      emcontactname: req.body.emcontactname,
      emcontactno: req.body.emcontactno,
    },
    {
      where: { id: id },
    }
  )

    .then(() => {
      res.send({
        message: "Profile Details updated successfully!",
      });
    })

    .catch((err) => {
      res.status(500).send({
        message: "Error updating Member with id=" + id + err,
      });
    });
};

// Update a Member Photo by the id in the request
exports.updatePhoto = (req, res) => {
  const id = req.params.id;
  Member.update(
    {
      profile: req.body.profile,
      // profile: req.file,
    },
    {
      where: { id: id },
    }
  )

    .then(() => {
      res.send({
        message: "Profile Image Data updated successfully!",
      });
    })

    .catch((err) => {
      res.status(500).send({
        message: "Error updating Member with id=" + id + err,
      });
    });
};

// Retrieve all Members from the database.
exports.findAll = async (req, res) => {
  const username = req.query.username;
  var condition = username
    ? { username: { [Op.like]: `%${username}%` } }
    : null;

  const allMember = await Member.findAll(
    // { where: condition &&

    {
      where: condition,
      // Make sure to include the products
      // include: [
      //   {
      //     model: role,
      //     as: "roles",
      //     required: false,
      //     // Pass in the Product attributes that you want to retrieve
      //     // attributes: ["id", "username", "email", "password", "active"],
      //     // attributes: ["roleId", "userId"],
      //     // attributes: ["id", "name", "roleCode"],
      //     attributes: ["name", "roleCode"],
      //     through: {
      //       // This block of code allows you to retrieve the properties of the join table
      //       model: user_roles,
      //       as: "user_roles",
      //       // attributes: ["id", "name", "roleCode"],
      //       attributes: ["roleId", "userId"],
      //     },
      //   },
      // ],

      include: [
        {
          model: branch,
          as: "branches",
          required: false,
          attributes: ["name", "brCode"],
          through: {
            model: user_branches,
            as: "user_branches",
            attributes: ["brId", "userId"],
          },
        },
        {
          model: dept,
          as: "depts",
          required: false,
          attributes: ["name", "description"],
          through: {
            model: user_depts,
            as: "user_depts",
            attributes: ["deptId", "userId"],
          },
        },
        {
          model: role,
          as: "roles",
          required: false,
          attributes: ["name", "roleCode"],
          through: {
            model: user_roles,
            as: "user_roles",
            attributes: ["roleId", "userId"],
          },
        },
      ],
    }
    // }
  )
    .then((allMember) => {
      res.send(allMember);
      // console.log(allMember);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving members.",
      });
    });
};

// router.get(
//   "/orders/",
//   asyncHandler(async (req, res) => {
//     // Get all orders
//     const allOrders = await Order.findAll({
//       // Make sure to include the products
//       include: [
//         {
//           model: Product,
//           as: "products",
//           required: false,
//           // Pass in the Product attributes that you want to retrieve
//           attributes: ["id", "name"],
//           through: {
//             // This block of code allows you to retrieve the properties of the join table
//             model: ProductOrder,
//             as: "productOrders",
//             attributes: ["qty"],
//           },
//         },
//       ],
//     });

//     // If everything goes well respond with the orders
//     return respondWith(res, 200, ["Returning all orders"], { allOrders });
//   })
// );

// Find a single Member with an id
exports.findOneMember = (req, res) => {
  const id = req.params.id;

  Member.findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Member with id=" + id,
      });
    });
};

// Change Password of a Member by the id in the request
exports.changePass = (req, res) => {
  const id = req.params.id;
  // console.log(req.body),
  Member.update(
    {
      password: bcrypt.hashSync(req.body.password, 8),
    },
    {
      where: { id: id },
    }
  )
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Password updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update Member password with id=${id}. Maybe Member is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Member password with id=" + id,
      });
    });
};

// send activation link in email
// exports.activationlink = (req, res) => {
//   const id = req.body.id;
//   const email = req.body.email;

//   var resetlink = Math.floor(100000 + Math.random() * 900000);

//   var data = {
//     resetlink: resetlink,
//     email: email,
//   };

//   sendEmail.sendActivation(data);

//   Member.update(
//     {
//       resetlink: resetlink,
//     },
//     {
//       where: { id: id },
//     }
//   )
//     .then(() => {
//       setTimeout(() => {
//         res.send({
//           message: "Activation Link and Token sent to user for further action.",
//         });
//       }, 1500);
//     })

//     .catch((err) => {
//       res.status(500).send({
//         message: "Something went wrong. Please try again" + " " + err,
//       });
//     });
// };

// send reset password link in email
exports.sendlink = (req, res) => {
  // console.log(req.params);
  // console.log(req.body);
  // // const email = req.body.email;
  // const email = req.body.email;
  // Member.findOne({
  //   where: { email: email },
  // }).then((foundUser) => {
  //   if (foundUser === null) {
  //     console.log("Not found!");
  //   } else {
  //     console.log(foundUser instanceof Member); // true
  //     console.log(foundUser.username); // 'username'
  //   }
  // });

  // var id = "jb.adjuster@email.com";
  // console.log(req);
  const email = req.body.email;
  var condition = email ? { email: { [Op.like]: `%${email}%` } } : null;

  Member.findOne({
    where: condition,
  })
    .then((user) => {
      if (!user) {
        return res.status(404).send({
          message: email + " " + "is not registered with us.",
        });
      } else {
        // console.log(user.email); // 'email'
        // return res.send({ message: "The User is" + " " + user.username });
        var resetlink = Math.floor(100000 + Math.random() * 900000);
        // console.log(email);
        var data = {
          resetlink: resetlink,
          email: email,
        };
        // console.log(resetlink);
        // const email = user.email;
        // var sent = sendEmail.resetPassword(email, resetlink);
        // console.log(data);
        sendEmail.resetPassword(data);

        Member.update(
          {
            resetlink: resetlink,
          },
          {
            where: condition,
            // where: { email: "jb.adjuster@email.com" },
          }
        )
          .then(() => {
            setTimeout(() => {
              res.send({
                message:
                  "Account found! Please check your email for further info.",
              });
            }, 1500);
          })

          .catch((err) => {
            res.status(500).send({
              message: "Something went wrong. Please try again" + " " + err,
            });
          });

        // setTimeout(() => {
        //   res.send({ message: "Notification Email Sent" });
        // }, 2500);

        // if (sent != "0") {
        //   var data = {
        //     resetlink: resetlink
        //   };
        //   console.log(email + "second");
        //   Member.update(
        //     {
        //       resetlink: data,
        //     },
        //     {
        //       where: condition,
        //       // where: { email: "jb.adjuster@email.com" },
        //     }
        //   )
        //     .then(() => {
        //       res.send({
        //         message:
        //           "The reset password link has been sent to your email address",
        //       });
        //     })

        //     .catch((err) => {
        //       res.status(500).send({
        //         message: "Something went wrong. Please try again" + err,
        //       });
        //     });
        // } else {
        //   return res
        //     .status(404)
        //     .send({ message: "Something went wrong. Please try again" });
        // }
      }
    })
    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

exports.verifyUser = (req, res) => {
  const email = req.body.email;
  var condition = email ? { email: { [Op.like]: `%${email}%` } } : null;
  Member.findOne({
    where: condition,
  })
    .then(async (user) => {
      if (!user) {
        return res.status(404).send({
          message: "User with email =" + " " + email + " " + "Not found.",
        });
      } else {
        // console.log(user.username);
        const resetlink = req.body.token;

        // console.log(resetlink);
        // console.log(user.resetlink);

        if (resetlink != user.resetlink) {
          return res.status(401).send({
            message: "Invalid Token!",
          });
        }

        if (resetlink === user.resetlink) {
          return res
            .status(200)
            .send({ message: "User verification successfull.", id: user.id });
        }
      }
    })

    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

// update password to database
exports.reset = (req, res, next) => {
  var resetlink = req.body.resetlink;
  var password = req.body.password;

  User.query(
    'SELECT * FROM users WHERE resetlink ="' + resetlink + '"',
    function (err, result) {
      if (err) throw err;

      var type;
      var msg;

      if (result.length > 0) {
        var saltRounds = 10;

        // var hash = bcrypt.hash(password, saltRounds);

        bcrypt.genSalt(saltRounds, function (err, salt) {
          bcrypt.hash(password, salt, function (err, hash) {
            var data = {
              password: hash,
            };

            User.query(
              'UPDATE users SET ? WHERE email ="' + result[0].email + '"',
              data,
              function (err, result) {
                if (err) throw err;
              }
            );
          });
        });

        type = "success";
        msg = "Your password has been updated successfully";
      } else {
        console.log("2");
        type = "success";
        msg = "Invalid link; please try again";
      }

      // req.flash(type, msg);
      // res.redirect("/");
    }
  );
};

// Delete a Member with the specified id in the request
exports.deleteMember = (req, res) => {
  const id = req.params.id;

  Member.destroy({
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Member deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete Member with id=${id}. Maybe Member is not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete Member with id=" + id,
      });
    });
};

// Delete all Members from the database.
// exports.deleteAllMember = (req, res) => {
//     Member.destroy({
//       where: {},
//       truncate: false
//     })
//       .then(nums => {
//         res.send({ message: `${nums} Members were deleted successfully!` });
//       })
//       .catch(err => {
//         res.status(500).send({
//           message:
//             err.message || "Some error occurred while removing all members."
//         });
//       });
//   };

// Find all active members
exports.findAllActiveMember = (req, res) => {
  Member.findAll({ where: { active: true } })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving members.",
      });
    });
};

// Fetch all Member include Roles
// exports.findAllRoles = (req, res) => {
//   Member.findAll({
//     attributes: ["username", "email", "active"],
//     include: [
//       {
//         model: Role,
//         // as: "Roles",
//         attributes: ["name", "roleCode"],
//         through: {
//           attributes: ["userId", "roleId"],
//         },
//       },
//     ],
//   })

//     // .then((userLevel) => {
//     //   res.send(userLevel);
//     // });
//     .then((data) => {
//       res.send(data);
//     });
// };

// Fetch all Member include Roles
exports.findAllRoles = (req, res) => {
  const id = req.params.id;
  Member.findAll({
    attributes: ["username", "email", "active"],
    include: [
      {
        model: Role,
        as: "roles",
        attributes: ["name", "roleCode"],
        through: {
          attributes: ["userId", "roleId"],
        },
      },
    ],
  })
    // .then((userLevel) => {
    //   res.send(userLevel);
    // });
    .then((data) => {
      res.send(data);
    });
};

// Fetch all Member include Departments
exports.findAllDepts = (req, res) => {
  const id = req.params.id;
  Member.findAll({
    attributes: ["username", "email", "active"],
    include: [
      {
        model: Dept,
        as: "depts",
        attributes: ["name", "description"],
        through: {
          attributes: ["userId", "deptId"],
        },
      },
    ],
  }).then((data) => {
    res.send(data);
  });
};

// Fetch all Member include Branches
exports.findAllBranches = (req, res) => {
  const id = req.params.id;
  Member.findAll({
    attributes: ["username", "email", "active"],
    include: [
      {
        model: Branch,
        as: "branches",
        attributes: ["name", "brCode"],
        through: {
          attributes: ["userId", "brId"],
        },
      },
    ],
  }).then((data) => {
    res.send(data);
  });
};
