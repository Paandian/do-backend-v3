const db = require("../models");
const ExcelJS = require("exceljs");
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

// Helper functions to get display names (simulate what reportsTwo.vue does)
async function getMetaData() {
  // Use correct model for adjusters and handlers
  // Adjusters: db.user (filter by roleCode 'adjuster')
  // Handlers: db.handler
  const [
    insurers,
    branches,
    departments,
    subRefTypes,
    handlers,
    stages,
    users,
  ] = await Promise.all([
    db.inss.findAll(),
    db.branch.findAll(),
    db.dept.findAll(),
    db.subDept.findAll(),
    db.handler.findAll(),
    db.stages.findAll(),
    db.user.findAll(),
  ]);
  // Adjusters: filter users by roleCode 'adjuster'
  const adjusters = users.filter(
    (u) =>
      Array.isArray(u.roles) &&
      u.roles.some(
        (r) =>
          (r.roleCode || r.code || r.name || "").toLowerCase() === "adjuster"
      )
  );
  return {
    insurers,
    branches,
    departments,
    subRefTypes,
    adjusters,
    handlers,
    stages,
    users, // keep users for fallback
  };
}

// Helper to get display value for filter keys
function getFilterDisplay(key, value, meta) {
  if (!value) return "";
  switch (key) {
    case "insurer":
      return getNameById(meta.insurers, value);
    case "branch":
      return getNameById(meta.branches, value);
    case "refType":
      return getNameById(meta.departments, value);
    case "subRefType":
      return getSubCodeById(meta.subRefTypes, value);
    case "adjuster":
      return getUsernameById(meta.adjusters, value);
    case "fileStatus":
      return getStageNameByCode(meta.stages, value);
    default:
      return value;
  }
}

function getNameById(arr, id, key = "name") {
  if (!arr || !id) return "";
  const found = arr.find((item) => String(item.id) === String(id));
  return found ? found[key] : "";
}

function getSubCodeById(arr, id) {
  if (!arr || !id) return "";
  const found = arr.find((item) => String(item.id) === String(id));
  return found ? found.subCode : "";
}

function getUsernameById(arr, id) {
  if (!arr || !id) return "";
  const found = arr.find((item) => String(item.id) === String(id));
  return found ? found.username : "";
}

function getStageNameByCode(arr, code) {
  if (!arr || !code) return "";
  const found = arr.find((item) => String(item.stageCode) === String(code));
  return found ? found.name : code;
}

// Retrieve paginated Casefiles from the database.
exports.findPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const offset = (page - 1) * pageSize;
    // Combine role-based and filter-based constraints
    const where = {
      ...buildUserWhere(req.query),
      ...buildFilters(req.query),
    };

    const daysDiffExpr = db.Sequelize.literal(`DATEDIFF(NOW(), dateOfAssign)`);

    // If export=excel, return Excel file
    if (req.query.export === "excel") {
      const rows = await Casefile.findAll({
        where,
        attributes: {
          include: [
            [db.Sequelize.literal(`DATEDIFF(NOW(), dateOfAssign)`), "days"],
          ],
        },
        order: [
          [db.Sequelize.literal(`DATEDIFF(NOW(), dateOfAssign)`), "DESC"],
        ],
        ...(req.query.page && req.query.pageSize
          ? {
              limit: parseInt(req.query.pageSize),
              offset:
                (parseInt(req.query.page) - 1) * parseInt(req.query.pageSize),
            }
          : {}),
      });

      const meta = await getMetaData();

      // Create Excel workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("File Report");

      // --- Cosmetic: Title ---
      worksheet.mergeCells("A1:S1");
      worksheet.getCell("A1").value = "AASB File Report";
      worksheet.getCell("A1").font = { size: 16, bold: true };
      worksheet.getCell("A1").alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      // --- Cosmetic: Number of files ---
      worksheet.mergeCells("A2:S2");
      worksheet.getCell("A2").value = `Number of Files: ${rows.length}`;
      worksheet.getCell("A2").font = { size: 12, bold: true };
      worksheet.getCell("A2").alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      // --- Cosmetic: Filtered by (show display names) ---
      worksheet.mergeCells("A3:S3");
      worksheet.getCell("A3").value =
        "Filtered by: " +
        (Object.entries(req.query)
          .filter(
            ([k, v]) => v && k !== "export" && k !== "page" && k !== "pageSize"
          )
          .map(([k, v]) => {
            const display = getFilterDisplay(k, v, meta);
            return display ? `${k}: ${display}` : "";
          })
          .filter(Boolean)
          .join(", ") || "None");
      worksheet.getCell("A3").font = { size: 11, italic: true };
      worksheet.getCell("A3").alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      // --- Cosmetic: Blank row before table ---
      worksheet.addRow([]);

      // --- Table header: add NO. column first ---
      worksheet.columns = [
        { header: "NO.", key: "numbering", width: 7 },
        { header: "CLAIMS HANDLER", key: "handler", width: 22 },
        { header: "INSURER'S REF", key: "claimNo", width: 18 },
        { header: "INSURED NAME", key: "insuredName", width: 22 },
        { header: "VEHICLE NO", key: "vehicleNo", width: 18 },
        { header: "INSURER", key: "insurer", width: 22 },
        { header: "CLAIM TYPE", key: "claimType", width: 18 },
        { header: "BRANCH", key: "branch", width: 18 },
        { header: "DEPARTMENT", key: "department", width: 18 },
        { header: "FILE CLASSIFICATION", key: "fileClassification", width: 22 },
        { header: "ADJUSTER", key: "adjuster", width: 18 },
        { header: "AASB REF", key: "aasbRef", width: 24 },
        { header: "DATE OF ASSIGNMENT", key: "dateOfAssign", width: 18 },
        { header: "DATE OF LOSS", key: "dateOfLoss", width: 18 },
        { header: "DAYS", key: "days", width: 10 },
        {
          header: "ADJUSTER ACKNOWLEDMENT DATE",
          key: "dateStartInv",
          width: 22,
        },
        { header: "REPORT SUBMISSION DATE", key: "dateEndInv", width: 22 },
        { header: "STATUS", key: "fileStatus", width: 18 },
        {
          header: "TOTAL AMOUNT OF ALL TAX INVOICES",
          key: "invTotal",
          width: 22,
        },
      ];

      // --- Table header row ---
      worksheet.addRow(worksheet.columns.map((col) => col.header));

      // --- Table rows ---
      rows.forEach((row, idx) => {
        worksheet.addRow([
          idx + 1,
          getNameById(meta.handlers, row.handler) ||
            getUsernameById(meta.users, row.handler),
          row.claimNo || "",
          row.insuredName || "",
          row.vehicleNo ? row.vehicleNo.toUpperCase() : "",
          getNameById(meta.insurers, row.insurer),
          getNameById(meta.departments, row.refType),
          getNameById(meta.branches, row.branch),
          getNameById(meta.departments, row.refType),
          getSubCodeById(meta.subRefTypes, row.subRefType),
          getUsernameById(meta.adjusters, row.adjuster) ||
            getUsernameById(meta.users, row.adjuster),
          `AA/${getNameById(meta.departments, row.refType)}/${getSubCodeById(
            meta.subRefTypes,
            row.subRefType
          )}/${row.id}/${
            row.createdAt
              ? new Date(row.createdAt).getFullYear().toString().slice(-2)
              : ""
          }/${getNameById(meta.branches, row.branch, "brCode")}`,
          row.dateOfAssign
            ? new Date(row.dateOfAssign).toLocaleDateString("en-GB")
            : "",
          row.dateOfLoss
            ? new Date(row.dateOfLoss).toLocaleDateString("en-GB")
            : "",
          row.dataValues.days,
          row.dateStartInv
            ? new Date(row.dateStartInv).toLocaleDateString("en-GB")
            : "",
          row.dateEndInv
            ? new Date(row.dateEndInv).toLocaleDateString("en-GB")
            : "",
          getStageNameByCode(meta.stages, row.fileStatus),
          row.invTotal || "",
        ]);
      });

      // --- Cosmetic: Style header row only ---
      const headerRow = worksheet.getRow(5);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDDEEFF" },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 5) {
          row.font = { bold: false };
          row.alignment = { vertical: "middle", horizontal: "left" };
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        }
      });

      worksheet.views = [{ state: "frozen", ySplit: 5 }];

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Report_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
      return;
    }

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

function buildFilters(query) {
  const where = {};
  if (query.insurer) where.insurer = query.insurer;
  if (query.branch) where.branch = query.branch;
  if (query.refType) where.refType = query.refType;
  if (query.subRefType) where.subRefType = query.subRefType;
  if (query.adjuster) where.adjuster = query.adjuster;
  if (query.vehicleNo) where.vehicleNo = { [Op.like]: `%${query.vehicleNo}%` };
  if (query.startDate && query.endDate) {
    where.dateOfAssign = {
      [Op.between]: [query.startDate, query.endDate],
    };
  } else if (query.startDate) {
    where.dateOfAssign = { [Op.gte]: query.startDate };
  } else if (query.endDate) {
    where.dateOfAssign = { [Op.lte]: query.endDate };
  }
  if (query.id) where.id = query.id;
  if (query.fileStatus) where.fileStatus = query.fileStatus;
  return where;
}

// Retrieve paginated Casefiles except fileStatus "CANC" or "CLO"
exports.findPaginatedActive = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const offset = (page - 1) * pageSize;
    // Combine role-based and filter-based constraints
    let where = {
      fileStatus: { [Op.notIn]: ["CANC", "CLO"] },
      ...buildUserWhere(req.query),
      ...buildFilters(req.query),
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
    // Combine role-based and filter-based constraints
    let where = {
      fileStatus: { [Op.in]: ["CANC", "CLO"] },
      ...buildUserWhere(req.query),
      ...buildFilters(req.query),
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

// Compliance: Closed Files by Department (API)
exports.getClosedFilesComplianceReport = async (req, res) => {
  try {
    const { deptId, classificationId, month } = req.query;
    // Calculate month range
    let startDate = null,
      endDate = null;
    if (month) {
      startDate = `${month}-01`;
      endDate = `${month}-31`;
    }
    // Build where clause
    const where = {
      fileStatus: { [Op.in]: ["CLO", "CLOSED"] },
      ...(deptId && { refType: deptId }),
      ...(classificationId &&
        classificationId !== "null" && { subRefType: classificationId }),
      ...(month && {
        dateClosed: {
          [Op.between]: [startDate, endDate],
        },
      }),
    };
    // Fetch closed files with branch info
    const files = await Casefile.findAll({
      where,
      attributes: ["branch", "dateOfAssign", "dateClosed", "id"],
    });

    // Get branch names
    const branchIds = [...new Set(files.map((f) => f.branch))];
    const branches = await db.branch.findAll({
      where: { id: branchIds },
      attributes: ["id", "name"],
    });
    const branchMap = {};
    branches.forEach((b) => {
      branchMap[b.id] = b.name;
    });

    // Bucket by days and group by branch
    const buckets = {};
    files.forEach((file) => {
      const branchName = branchMap[file.branch] || "Unknown";
      if (!buckets[branchName]) {
        buckets[branchName] = {
          below30: 0,
          above30: 0,
          above45: 0,
          above60: 0,
          above90: 0,
          total: 0,
        };
      }
      // Calculate days between assign and closed
      let days = 0;
      if (file.dateOfAssign && file.dateClosed) {
        days = Math.abs(
          Math.floor(
            (new Date(file.dateClosed) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        );
      }
      if (days < 30) buckets[branchName].below30 += 1;
      if (days >= 30 && days < 45) buckets[branchName].above30 += 1;
      if (days >= 45 && days < 60) buckets[branchName].above45 += 1;
      if (days >= 60 && days < 90) buckets[branchName].above60 += 1;
      if (days >= 90) buckets[branchName].above90 += 1;
      buckets[branchName].total += 1;
    });

    // Prepare response
    const reportData = Object.entries(buckets).map(([branch, counts]) => ({
      branch,
      ...counts,
    }));

    // Sort branches alphabetically
    reportData.sort((a, b) => a.branch.localeCompare(b.branch));

    // Totals
    const totals = {
      below30: 0,
      above30: 0,
      above45: 0,
      above60: 0,
      above90: 0,
      total: 0,
    };
    reportData.forEach((row) => {
      totals.below30 += row.below30;
      totals.above30 += row.above30;
      totals.above45 += row.above45;
      totals.above60 += row.above60;
      totals.above90 += row.above90;
      totals.total += row.total;
    });

    res.json({ reportData, totals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Compliance: Closed Files by Department (Excel Export)
exports.exportClosedFilesComplianceReport = async (req, res) => {
  try {
    const { deptId, classificationId, month } = req.query;
    let startDate = null,
      endDate = null;
    if (month) {
      startDate = `${month}-01`;
      endDate = `${month}-31`;
    }
    const where = {
      fileStatus: { [Op.in]: ["CLO", "CLOSED"] },
      ...(deptId && { refType: deptId }),
      ...(classificationId &&
        classificationId !== "null" && { subRefType: classificationId }),
      ...(month && {
        dateClosed: {
          [Op.between]: [startDate, endDate],
        },
      }),
    };
    const files = await Casefile.findAll({
      where,
      attributes: ["branch", "dateOfAssign", "dateClosed", "id"],
    });

    const branchIds = [...new Set(files.map((f) => f.branch))];
    const branches = await db.branch.findAll({
      where: { id: branchIds },
      attributes: ["id", "name"],
    });
    const branchMap = {};
    branches.forEach((b) => {
      branchMap[b.id] = b.name;
    });

    const buckets = {};
    files.forEach((file) => {
      const branchName = branchMap[file.branch] || "Unknown";
      if (!buckets[branchName]) {
        buckets[branchName] = {
          below30: 0,
          above30: 0,
          above45: 0,
          above60: 0,
          above90: 0,
          total: 0,
        };
      }
      let days = 0;
      if (file.dateOfAssign && file.dateClosed) {
        days = Math.abs(
          Math.floor(
            (new Date(file.dateClosed) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        );
      }
      if (days < 30) buckets[branchName].below30 += 1;
      if (days >= 30 && days < 45) buckets[branchName].above30 += 1;
      if (days >= 45 && days < 60) buckets[branchName].above45 += 1;
      if (days >= 60 && days < 90) buckets[branchName].above60 += 1;
      if (days >= 90) buckets[branchName].above90 += 1;
      buckets[branchName].total += 1;
    });

    const reportData = Object.entries(buckets).map(([branch, counts]) => ({
      branch,
      ...counts,
    }));

    // Sort branches alphabetically
    reportData.sort((a, b) => a.branch.localeCompare(b.branch));

    const totals = {
      below30: 0,
      above30: 0,
      above45: 0,
      above60: 0,
      above90: 0,
      total: 0,
    };
    reportData.forEach((row) => {
      totals.below30 += row.below30;
      totals.above30 += row.above30;
      totals.above45 += row.above45;
      totals.above60 += row.above60;
      totals.above90 += row.above90;
      totals.total += row.total;
    });

    // Excel generation
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Compliance Report");

    // --- Title row ---
    let deptName = "DEPARTMENT";
    if (deptId) {
      const dept = await db.dept.findByPk(deptId);
      if (dept) deptName = dept.name;
    }
    const monthStr = month ? month : "";
    const titleText = `${deptName.toUpperCase()} CLOSED FILES - ${monthStr.toUpperCase()}`;
    sheet.addRow([titleText]);
    sheet.mergeCells("A1:G1");
    const titleRow = sheet.getRow(1);
    titleRow.height = 41.25;
    titleRow.getCell(1).font = { name: "Tahoma", size: 14, bold: true };
    titleRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    titleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2EFDA" },
    };

    // --- Header row ---
    const headerValues = [
      "BRANCH",
      "BELOW 30 DAYS",
      "ABOVE 30 DAYS",
      "ABOVE 45 DAYS",
      "ABOVE 60 DAYS",
      "ABOVE 90 DAYS",
      "TOTAL",
    ];
    sheet.addRow(headerValues);
    const headerRow = sheet.getRow(2);
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: "Tahoma",
        size: 12,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF548235" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.value = String(cell.value).toUpperCase();
    });

    // --- Data rows ---
    let rowIdx = 3;
    reportData.forEach((row) => {
      const values = [
        String(row.branch).toUpperCase(),
        row.below30,
        row.above30,
        row.above45,
        row.above60,
        row.above90,
        row.total,
      ];
      sheet.addRow(values);
      const dataRow = sheet.getRow(rowIdx);
      dataRow.height = 18;
      dataRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Tahoma", size: 12, bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (colNumber === 1) {
          cell.value = String(cell.value).toUpperCase();
        }
      });
      rowIdx++;
    });

    // --- Total row (last row for totals per day bucket) ---
    sheet.addRow([
      "TOTAL",
      totals.below30,
      totals.above30,
      totals.above45,
      totals.above60,
      totals.above90,
      totals.total,
    ]);
    const totalRow = sheet.getRow(rowIdx);
    totalRow.height = 18;
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Tahoma", size: 12, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.value = String(cell.value).toUpperCase();
      // No background color for this row
    });

    // --- Grand Total row (merged cells for "GRAND TOTAL") ---
    sheet.addRow(["", "", "", "GRAND TOTAL", "", "", totals.total]);
    const grandTotalRow = sheet.getRow(rowIdx + 1);
    grandTotalRow.height = 47.25;
    // Merge columns D, E, F for "GRAND TOTAL"
    sheet.mergeCells(`D${rowIdx + 1}:F${rowIdx + 1}`);
    // Style merged cell for "GRAND TOTAL"
    grandTotalRow.getCell(4).font = { name: "Tahoma", size: 16, bold: true };
    grandTotalRow.getCell(4).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    grandTotalRow.getCell(4).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF70AD47" },
    };
    grandTotalRow.getCell(4).value = "GRAND TOTAL";
    // Style the cell for the grand total number (column G)
    grandTotalRow.getCell(7).font = { name: "Tahoma", size: 20, bold: true };
    grandTotalRow.getCell(7).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    grandTotalRow.getCell(7).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2EFDA" },
    };
    grandTotalRow.getCell(7).value = totals.total;

    // --- Set column widths ---
    sheet.getColumn(1).width = 22;
    for (let i = 2; i <= 7; i++) {
      sheet.getColumn(i).width = 18;
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${deptName}_ClosedFiles_${monthStr}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
