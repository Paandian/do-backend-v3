const db = require("../models");
const config = require("../config/auth.config");
const {
  user: User,
  role: Role,
  branch: Branch,
  refreshToken: RefreshToken,
} = db;
// const User = db.user;
// const Role = db.role;

const Op = db.Sequelize.Op;

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");

// exports.signup = (req, res) => {
//   // Save User to Database
//   User.create({
//     username: req.body.username,
//     email: req.body.email,
//     password: bcrypt.hashSync(req.body.password, 8),
//     active: req.body.active ? req.body.active : true,
//   })
//     .then((user) => {
//       if (req.body.roles) {
//         Role.findAll({
//           where: {
//             roleCode: {
//               [Op.or]: req.body.roles,
//             },
//           },
//         }).then((roles) => {
//           user.setRoles(roles).then(() => {
//             res.send({ message: "User was registered successfully!" });
//           });
//         });
//       } else {
//         // user role = 1
//         user.setRoles([1]).then(() => {
//           res.send({ message: "User was registered successfully!" });
//         });
//       }
//     })
//     .catch((err) => {
//       res.status(500).send({ message: err.message });
//     });
// };

exports.signin = (req, res) => {
  User.findOne({
    where: {
      email: req.body.email,
    },
  })
    .then(async (user) => {
      if (!user) {
        return res.status(404).send({ message: "User Not found." });
      }

      const passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Invalid Password!",
        });
      }

      const token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: config.jwtExpiration,
      });

      let refreshToken = await RefreshToken.createToken(user);

      let authorities = [];
      await user.getRoles().then((roles) => {
        for (let i = 0; i < roles.length; i++) {
          // authorities.push("ROLE_" + roles[i].name.toUpperCase());
          authorities.push(roles[i].roleCode.toUpperCase());
        }
      });

      let department = [];
      await user.getDepts().then((depts) => {
        for (let k = 0; k < depts.length; k++) {
          department.push(depts[k].id);
        }
      });

      let allBranches = [];
      await user.getBranches().then((branches) => {
        for (let l = 0; l < branches.length; l++) {
          allBranches.push(branches[l].id);
        }

        res.status(200).send({
          id: user.id,
          username: user.username,
          profile: user.profile,
          fullname: user.fullname,
          nric: user.nric,
          email: user.email,
          telnumber: user.telnumber,
          datejoined: user.datejoined,
          position: user.position,
          empid: user.empid,
          usercode: user.usercode,
          address: user.address,
          emcontactname: user.emcontactname,
          emcontactno: user.emcontactno,
          roles: authorities,
          accessToken: token,
          refreshToken: refreshToken,
          branches: allBranches,
          dept: department,
        });
      });
    })
    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

exports.refreshToken = async (req, res) => {
  const { refreshToken: requestToken } = req.body;

  if (requestToken == null) {
    return res.status(403).json({ message: "Refresh Token is required!" });
  }

  try {
    let refreshToken = await RefreshToken.findOne({
      where: { token: requestToken },
    });

    // console.log(refreshToken);

    if (!refreshToken) {
      res.status(403).json({ message: "Refresh token is not in database!" });
      return;
    }

    if (RefreshToken.verifyExpiration(refreshToken)) {
      RefreshToken.destroy({ where: { id: refreshToken.id } });

      res.status(403).json({
        message: "Refresh token is expired. Please make a new signin request",
      });
      return;
    }

    const user = await refreshToken.getUser();
    let newAccessToken = jwt.sign({ id: user.id }, config.secret, {
      expiresIn: config.jwtExpiration,
    });

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: refreshToken.token,
    });
  } catch (err) {
    return res.status(500).send({ message: err });
  }
};
