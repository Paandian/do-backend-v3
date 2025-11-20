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

      // --- FIX: define dateStr and totalFiles ---
      const reportDate = new Date();
      const dateStr = reportDate.toLocaleDateString("en-GB");
      const totalFiles = rows.length;

      // Create Excel workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("File Report");

      // --- Title row ---
      worksheet.mergeCells("A1:S1");
      worksheet.getCell("A1").value = {
        formula: `="AASB FILE REPORT | " & TEXT(TODAY(),"DD/MM/YYYY") & " | TOTAL: " & SUBTOTAL(3,B5:B${
          rows.length + 4
        })`,
      };
      worksheet.getCell("A1").font = { name: "Calibri", size: 16, bold: true };
      worksheet.getCell("A1").alignment = {
        vertical: "middle",
        horizontal: "left",
      };

      // --- Filtered by row ---
      worksheet.mergeCells("A2:S2");
      worksheet.getCell("A2").value =
        "FILTERED BY: " +
        (() => {
          const filterDisplays = [];
          const dateFieldMap = {
            dateOfAssign: "Date Of Assignment",
            dateClosed: "Date Closed",
            dateOfCancel: "Date Canceled",
            dateFinal: "Finalisation Date",
          };
          const dateBy = req.query.dateBy || "dateOfAssign";
          if (req.query.startDate || req.query.endDate) {
            const label = dateFieldMap[dateBy] || dateBy;
            let start = req.query.startDate
              ? new Date(req.query.startDate).toLocaleDateString("en-GB")
              : "";
            let end = req.query.endDate
              ? new Date(req.query.endDate).toLocaleDateString("en-GB")
              : "";
            filterDisplays.push(
              `${label} FROM: ${start || "-"} TO: ${end || "-"}`
            );
          }
          Object.entries(req.query)
            .filter(
              ([k, v]) =>
                v &&
                k !== "export" &&
                k !== "page" &&
                k !== "pageSize" &&
                k !== "dateBy" &&
                k !== "startDate" &&
                k !== "endDate"
            )
            .forEach(([k, v]) => {
              const display = getFilterDisplay(k, v, meta);
              if (display) {
                filterDisplays.push(`${getFilterLabel(k)}: ${display}`);
              }
            });
          return filterDisplays.length ? filterDisplays.join(" | ") : "None";
        })();
      worksheet.getCell("A2").font = {
        name: "Calibri",
        size: 11,
        italic: true,
      };
      worksheet.getCell("A2").alignment = {
        vertical: "middle",
        horizontal: "left",
      };

      // --- Blank row before table ---
      worksheet.addRow([]);

      // --- Table header row (Row 4) ---
      const headerColumns = [
        "NO.",
        "CLAIMS HANDLER",
        "INSURER'S REF",
        "INSURED NAME",
        "VEHICLE NO",
        "INSURER",
        "CLAIM TYPE",
        "BRANCH",
        "DEPARTMENT",
        "FILE CLASSIFICATION",
        "ADJUSTER",
        "AASB REF",
        "DATE OF ASSIGNMENT",
        "DATE OF LOSS",
        "DAYS",
        "ADJUSTER ACKNOWLEDMENT DATE",
        "REPORT SUBMISSION DATE",
        "STATUS",
        "INVOICE AMOUNT",
      ];
      worksheet.addRow(headerColumns);

      // Style header row (Row 4)
      const headerRow = worksheet.getRow(4);
      headerRow.font = { name: "Calibri", size: 11, bold: true };
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
        cell.value = String(cell.value).toUpperCase();
      });

      // --- Make header row filterable ---
      worksheet.autoFilter = {
        from: "A4",
        to: "S4",
      };

      // --- Data rows (Row 5 onwards) ---
      rows.forEach((row, idx) => {
        const excelRowNum = idx + 5;
        worksheet.addRow([
          // NO. column: renumbered after filtering
          {
            formula: `SUBTOTAL(3,$B$5:B${excelRowNum})`,
            alignment: { vertical: "middle", horizontal: "center" },
          },
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

      // Style data rows (Row 5 onwards)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 5) {
          row.font = { name: "Calibri", size: 11 };
          row.alignment = { vertical: "middle", horizontal: "left" };
          // Center align NO. column data
          row.getCell(1).alignment = {
            vertical: "middle",
            horizontal: "center",
          };
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

      worksheet.views = [{ state: "frozen", ySplit: 4 }];

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Report_${reportDate
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
  // Dynamic date filtering
  const dateField = query.dateBy || "dateOfAssign";
  if (query.startDate && query.endDate) {
    where[dateField] = {
      [Op.between]: [query.startDate, query.endDate],
    };
  } else if (query.startDate) {
    where[dateField] = { [Op.gte]: query.startDate };
  } else if (query.endDate) {
    where[dateField] = { [Op.lte]: query.endDate };
  }
  if (query.id) where.id = query.id;
  // Support multiple fileStatus values
  if (query.fileStatus) {
    if (Array.isArray(query.fileStatus)) {
      where.fileStatus = { [Op.in]: query.fileStatus };
    } else if (
      typeof query.fileStatus === "string" &&
      query.fileStatus.startsWith("[") &&
      query.fileStatus.endsWith("]")
    ) {
      // Handle JSON stringified array from frontend
      try {
        const arr = JSON.parse(query.fileStatus);
        if (Array.isArray(arr)) {
          where.fileStatus = { [Op.in]: arr };
        }
      } catch (e) {
        where.fileStatus = query.fileStatus;
      }
    } else {
      where.fileStatus = query.fileStatus;
    }
  }
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

// Helper: get display label for filter keys
function getFilterLabel(key) {
  switch (key) {
    case "insurer":
      return "Insurer Name";
    case "branch":
      return "Branch";
    case "refType":
      return "Department";
    case "subRefType":
      return "File Classification";
    case "adjuster":
      return "Adjuster";
    case "vehicleNo":
      return "Vehicle No";
    case "id":
      return "AASB Ref";
    case "fileStatus":
      return "Status";
    default:
      return key;
  }
}
