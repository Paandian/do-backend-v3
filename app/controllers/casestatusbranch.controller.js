const db = require("../models");
const Casefile = db.casefiles;
const Op = db.Sequelize.Op;

//Retrieve all Casefiles with fileStatus and branch
exports.findAllStatusBranch = (req, res) => {
  const fileStatus = req.params.fileStatus;
  const branch = req.params.branch;
  var condition = fileStatus
    ? { fileStatus: { [Op.like]: `${fileStatus}` } }
    : null;
  var condition2 = branch ? { branch: { [Op.like]: `${branch}` } } : null;

  Casefile.findAll({ where: condition && condition2 })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Casefile with branch=" + branch,
      });
    });
};
