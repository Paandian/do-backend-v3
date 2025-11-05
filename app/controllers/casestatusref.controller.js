const db = require("../models");
const Casefile = db.casefiles;
const Op = db.Sequelize.Op;

//Retrieve all Casefiles with fileStatus and refType
exports.findAllStatusRefType = (req, res) => {
  const fileStatus = req.params.fileStatus;
  const refType = req.params.refType;
  var condition = fileStatus
    ? { fileStatus: { [Op.like]: `${fileStatus}` } }
    : null;
  var condition2 = refType ? { refType: { [Op.like]: `${refType}` } } : null;

  Casefile.findAll({ where: condition && condition2 })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Casefile with refType=" + refType,
      });
    });
};
