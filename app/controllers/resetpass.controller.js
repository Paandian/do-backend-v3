// https://www.tutsmake.com/forgot-reset-password-in-node-js-express-mysql/
const sendEmail = require("../controllers/transporter.controller");

const db = require("../models");
const User = db.user;

// send reset password link in email
exports.sendLink = (req, res, next) => {
  var email = req.body.email;

  User.query(
    'SELECT * FROM users WHERE email ="' + email + '"',
    function (err, result) {
      if (err) throw err;

      var type = "";
      var msg = "";

      if (result[0].email.length > 0) {
        var resetlink = Math.floor(100000 + Math.random() * 900000);

        var sent = sendEmail.resetPassword(email, resetlink);

        if (sent != "0") {
          var data = {
            resetlink: resetlink,
          };

          User.query(
            'UPDATE users SET ? WHERE email ="' + email + '"',
            data,
            function (err, result) {
              if (err) throw err;
            }
          );

          type = "success";
          msg = "The reset password link has been sent to your email address";
        } else {
          type = "error";
          msg = "Something goes to wrong. Please try again";
        }
      } else {
        console.log("2");
        type = "error";
        msg = "The Email is not registered with us";
      }

      // req.flash(type, msg);
      // res.redirect("/");
    }
  );
};

// update password to database
exports.updatePass = (req, res, next) => {
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
