const db = require("../models");
const Casefile = db.casefiles;
const Op = db.Sequelize.Op;

// Create and Save a new Casefile
exports.create = (req, res) => {
  // Save Casefile to Database
  Casefile.create({
    caseFrom: req.body.caseFrom,
    fileStatus: req.body.fileStatus,
    flag: req.body.flag,
    createdBy: req.body.createdBy,
    refType: req.body.refType,
    subRefType: req.body.subRefType,
    branch: req.body.branch,
    insurer: req.body.insurer,
    handler: req.body.handler,
    adjuster: req.body.adjuster,
    editor: req.body.editor,
    clerkInCharge: req.body.clerkInCharge,
    claimNo: req.body.claimNo,
    dateOfAssign: req.body.dateOfAssign,
    vehicleNo: req.body.vehicleNo,
    dateOfLoss: req.body.dateOfLoss,
    timeOfLoss: req.body.timeOfLoss,
    stateOfLoss: req.body.stateOfLoss,
    placeOfLoss: req.body.placeOfLoss,
    placeOfLossPostcode: req.body.placeOfLossPostcode,
    policeReportDate: req.body.policeReportDate,
    policeReportTime: req.body.policeReportTime,
    insuredName: req.body.insuredName,
    insuredIC: req.body.insuredIC,
    insuredTel: req.body.insuredTel,
    policyNo: req.body.policyNo,
    insComment: req.body.insComment,
    dateOfCancel: req.body.dateOfCancel,
    dateOfReg: req.body.dateOfReg,
    dateOfAdj: req.body.dateOfAdj,
    dateStartInv: req.body.dateStartInv,
    dateEndInv: req.body.dateEndInv,
    dateStartEdi: req.body.dateStartEdi,
    dateEndEdi: req.body.dateEndEdi,
    dateOfApproval: req.body.dateOfApproval,
    dateStartFormatting: req.body.dateStartFormatting,
    dateEndFormatting: req.body.dateEndFormatting,
    dateFinal: req.body.dateFinal,
    dateClosed: req.body.dateClosed,
    invNo: req.body.invNo,
    invAmount: req.body.invAmount,
    transfer: req.body.transfer,
    transferDate: req.body.transferDate,
    transferBy: req.body.transferBy,
    cancelBy: req.body.cancelBy,
    registerBy: req.body.registerBy,
    assignAdjBy: req.body.assignAdjBy,
    editedBy: req.body.editedBy,
    approvedBy: req.body.approvedBy,
    formattedBy: req.body.formattedBy,
    finalBy: req.body.finalBy,
    closedBy: req.body.closedBy,
  })
    .then(() => {
      res.send({ message: "Casefile created successfully!" });
    })

    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

// Retrieve paginated Casefiles from the database.
exports.findPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const offset = (page - 1) * pageSize;
    const where = {};

    // ...existing filters...

    // Calculate days difference using MySQL DATEDIFF
    const daysDiffExpr = db.Sequelize.literal(`DATEDIFF(NOW(), dateOfAssign)`);

    const { count, rows } = await Casefile.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      attributes: {
        include: [[daysDiffExpr, "days"]],
      },
      order: [[daysDiffExpr, "DESC"]],
    });

    res.send({
      data: rows,
      total: count,
      page,
      pageSize,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error retrieving paginated Casefiles.",
    });
  }
};

function buildUserWhere(query) {
  const { roles, dept, branches, userId } = query;
  let where = {};

  if (!roles) return where;

  // Parse roles if sent as JSON string
  let rolesArr = Array.isArray(roles)
    ? roles
    : typeof roles === "string"
    ? JSON.parse(roles)
    : [];
  let deptArr = Array.isArray(dept)
    ? dept
    : typeof dept === "string"
    ? JSON.parse(dept)
    : [];
  let branchesArr = Array.isArray(branches)
    ? branches
    : typeof branches === "string"
    ? JSON.parse(branches)
    : [];

  if (
    rolesArr.includes("MANAGER") ||
    rolesArr.includes("ADMIN") ||
    rolesArr.includes("CLERK")
  ) {
    // No extra filter
  } else if (
    rolesArr.includes("BRANCHCLERK") ||
    rolesArr.includes("BRANCHMANAGER")
  ) {
    if (deptArr.length) where.refType = { [Op.in]: deptArr };
    if (branchesArr.length) where.branch = { [Op.in]: branchesArr };
  } else if (rolesArr.includes("ADJUSTER")) {
    if (deptArr.length) where.refType = { [Op.in]: deptArr };
    if (branchesArr.length) where.branch = { [Op.in]: branchesArr };
    if (userId) where.adjuster = userId;
  }
  // Add more role logic if needed
  return where;
}

// Retrieve paginated Casefiles except fileStatus "CANC" or "CLO"
exports.findPaginatedActive = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const offset = (page - 1) * pageSize;
    let where = {
      fileStatus: { [Op.notIn]: ["CANC", "CLO"] },
      ...buildUserWhere(req.query),
    };

    const daysDiffExpr = db.Sequelize.literal(`DATEDIFF(NOW(), dateOfAssign)`);

    const { count, rows } = await Casefile.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      attributes: {
        include: [[daysDiffExpr, "days"]],
      },
      order: [[daysDiffExpr, "DESC"]],
    });

    res.send({
      data: rows,
      total: count,
      page,
      pageSize,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error retrieving active paginated Casefiles.",
    });
  }
};

// Retrieve paginated Casefiles with fileStatus "CANC" or "CLO" only
exports.findPaginatedClosed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const offset = (page - 1) * pageSize;
    let where = {
      fileStatus: { [Op.in]: ["CANC", "CLO"] },
      ...buildUserWhere(req.query),
    };

    const daysDiffExpr = db.Sequelize.literal(`DATEDIFF(NOW(), dateOfAssign)`);

    const { count, rows } = await Casefile.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      attributes: {
        include: [[daysDiffExpr, "days"]],
      },
      order: [[daysDiffExpr, "DESC"]],
    });

    res.send({
      data: rows,
      total: count,
      page,
      pageSize,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error retrieving closed paginated Casefiles.",
    });
  }
};

// Retrieve all Casefiles from the database.
exports.findAll = (req, res) => {
  const insuredName = req.query.insuredName;
  var condition = insuredName
    ? { insuredName: { [Op.like]: `%${insuredName}%` } }
    : null;

  Casefile.findAll({ where: condition })
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving Casefiles.",
      });
    });
};

//Retrieve all Casefiles with a refType
// exports.findAllRefType = (req, res) => {
//   const refType = req.params.refType;
//   var condition = refType ? { refType: { [Op.like]: `${refType}` } } : null;

//   Casefile.findAll({ where: condition })
//     .then((data) => {
//       res.send(data);
//     })
//     .catch((err) => {
//       res.status(500).send({
//         message: "Error retrieving Casefile with refType=" + refType,
//       });
//     });
// };

//Retrieve all Casefiles with a branch
// exports.findAllBranch = (req, res) => {
//   const branch = req.params.branch;
//   var condition = branch ? { branch: { [Op.like]: `${branch}` } } : null;

//   Casefile.findAll({ where: condition })
//     .then((data) => {
//       res.send(data);
//     })
//     .catch((err) => {
//       res.status(500).send({
//         message: "Error retrieving Casefile with branch=" + branch,
//       });
//     });
// };

// Find a single Casefile with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Casefile.findByPk(id)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retrieving Casefile with id=" + id,
      });
    });
};

// Update a Casefile by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  Casefile.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Casefile updated successfully.",
        });
      } else {
        res.send({
          message: `Cannot update Casefile with id=${id}. Maybe Casefile is not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Casefile with id=" + id,
      });
    });
};

// Delete a Casefile with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Casefile.destroy({
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Casefile deleted successfully!",
        });
      } else {
        res.send({
          message: `Cannot delete Casefile with id=${id}. Maybe Casefile is not found!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Could not delete Casefile with id=" + id,
      });
    });
};

// Delete all Casefiles from the database.
// exports.deleteAll = (req, res) => {
//   Casefile.destroy({
//     where: {},
//     truncate: false,
//   })
//     .then((nums) => {
//       res.send({ message: `${nums} Casefiles were deleted successfully!` });
//     })
//     .catch((err) => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while removing all Casefiles.",
//       });
//     });
// };
