const db = require("../models");
const Casefile = db.casefiles;
const Op = db.Sequelize.Op;

//Retrieve all Casefiles with a refType
exports.findAllRefType = (req, res) => {
  const refType = req.params.refType;
  var condition = refType ? { refType: { [Op.like]: `${refType}` } } : null;

  Casefile.findAll({ where: condition })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Casefile with refType=" + refType,
      });
    });
};
