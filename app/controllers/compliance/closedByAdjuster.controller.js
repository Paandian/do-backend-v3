const db = require("../../models");
const ExcelJS = require("exceljs");

async function getClosedFiles({ adjusterId, startDate, endDate, month }) {
  const where = {
    adjuster: adjusterId,
    ...(month
      ? {
          dateEndInv: {
            [db.Sequelize.Op.between]: [`${month}-01`, `${month}-31`],
          },
        }
      : { dateEndInv: { [db.Sequelize.Op.between]: [startDate, endDate] } }),
  };
  return db.casefiles.findAll({
    where,
    attributes: [
      "id",
      "vehicleNo",
      "dateOfAssign",
      "branch",
      "refType",
      "fileStatus",
      "adjuster",
      "insurer",
      "claimNo",
      "subRefType",
      "dateEndInv",
    ],
    order: [["dateEndInv", "ASC"]],
  });
}

exports.exportClosedByAdjuster = async (req, res) => {
  try {
    const { adjusterId, startDate, endDate, month } = req.query;
    if (!adjusterId || (!month && (!startDate || !endDate))) {
      return res.status(400).json({ message: "Missing required parameters" });
    }
    const files = await getClosedFiles({
      adjusterId,
      startDate,
      endDate,
      month,
    });

    // ...fetch branch, dept, insurer, adjuster, stage, subDept maps (same as outstandingMaster)...

    // Get branch names and codes
    const branchIds = [...new Set(files.map((f) => f.branch))].filter(Boolean);
    const branches = branchIds.length
      ? await db.branch.findAll({
          where: { id: branchIds },
          attributes: ["id", "name", "brCode"],
        })
      : [];
    const branchMap = {};
    const branchCodeMap = {};
    branches.forEach((b) => {
      branchMap[b.id] = b.name;
      branchCodeMap[b.id] = b.brCode;
    });

    // Get department names
    const deptIds = [...new Set(files.map((f) => f.refType))].filter(Boolean);
    const depts = deptIds.length
      ? await db.dept.findAll({
          where: { id: deptIds },
          attributes: ["id", "name"],
        })
      : [];
    const deptMap = {};
    depts.forEach((d) => {
      deptMap[d.id] = d.name;
    });

    // Get insurer names
    const insurerIds = [...new Set(files.map((f) => f.insurer))].filter(
      Boolean
    );
    const insurers = insurerIds.length
      ? await db.inss.findAll({
          where: { id: insurerIds },
          attributes: ["id", "name"],
        })
      : [];
    const insurerMap = {};
    insurers.forEach((ins) => {
      insurerMap[ins.id] = ins.name;
    });

    // Get adjuster usernames
    const adjusterIds = [...new Set(files.map((f) => f.adjuster))].filter(
      Boolean
    );
    const adjusters = adjusterIds.length
      ? await db.user.findAll({
          where: { id: adjusterIds },
          attributes: ["id", "username"],
        })
      : [];
    const adjusterMap = {};
    adjusters.forEach((adj) => {
      adjusterMap[adj.id] = adj.username;
    });

    // Get TAT charts
    const tatCharts = await db.tatchart.findAll();
    const tatMap = {};
    tatCharts.forEach((t) => {
      tatMap[`${String(t.insId)}-${String(t.subDeptId)}`] = t.tatMax;
    });

    // Get stage names for fileStatus
    const stageCodes = [...new Set(files.map((f) => f.fileStatus))].filter(
      Boolean
    );
    const stages = stageCodes.length
      ? await db.stages.findAll({
          where: { stageCode: stageCodes },
          attributes: ["stageCode", "name"],
        })
      : [];
    const stageMap = {};
    stages.forEach((s) => {
      stageMap[s.stageCode] = s.name;
    });

    // Get file classification codes
    const subDeptIds = [...new Set(files.map((f) => f.subRefType))].filter(
      Boolean
    );
    const subDepts = subDeptIds.length
      ? await db.subDept.findAll({
          where: { id: subDeptIds },
          attributes: ["id", "subCode"],
        })
      : [];
    const subDeptMap = {};
    subDepts.forEach((sd) => {
      subDeptMap[sd.id] = sd.subCode;
    });

    // Helper: AA REF
    function getAasbRef(file) {
      const prefix = "AA";
      const deptName = deptMap[file.refType] || "";
      const runningNo = file.id ? String(file.id).padStart(6, "0") : "";
      const year = file.dateOfAssign
        ? String(new Date(file.dateOfAssign).getFullYear()).slice(-2)
        : "";
      const branchCode = branchCodeMap[file.branch] || "";
      return `${prefix}/${deptName}/${runningNo}/${year}/${branchCode}`;
    }

    // Excel generation (same columns as outstandingMaster, but use dateEndInv for closed date)
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Closed By Adjuster");

    // Header row
    sheet.addRow([]);
    sheet.getRow(1).height = 28;
    sheet.mergeCells("A1:N1");
    const totalFiles = files.length;
    sheet.getCell("A1").value =
      "ASSIGNMENTS CLOSED BY ADJUSTER".toUpperCase() +
      "    |    " +
      (month ? `Month: ${month}` : `Period: ${startDate} to ${endDate}`) +
      "    |    " +
      `Total Closed Files: ${totalFiles}`;
    sheet.getCell("A1").font = { name: "Calibri", size: 16, bold: true };
    sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

    // Data header row
    sheet.addRow([
      "NO",
      "VEHICLENO",
      "ASGDATE",
      "AGING",
      "BRANCH",
      "AA REF",
      "TYPE",
      "STATUS",
      "ADJUSTER",
      "INSURER",
      "INSURER REF",
      "REMARKS",
      "TAT",
      "CLOSED DATE",
    ]);
    const headerRow = sheet.getRow(2);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF76933C" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.value = String(cell.value).toUpperCase();
    });

    // Data rows
    let rowIdx = 3;
    let no = 1;
    files.forEach((file) => {
      const aging = file.dateOfAssign
        ? Math.floor(
            (new Date(file.dateEndInv) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        : "";
      const tatKey = `${file.insurer}-${file.subRefType}`;
      const hasTat = tatMap.hasOwnProperty(tatKey);
      const tatMax = hasTat ? tatMap[tatKey] : null;
      let tatValue = "";
      if (aging !== "" && tatMax !== null) {
        tatValue = aging - tatMax;
        if (tatValue > 0) tatValue = -tatValue;
      } else if (aging !== "") {
        tatValue = aging;
      }
      const dueDays = tatMax !== null ? tatMax : 30;
      const dueDate = file.dateOfAssign
        ? new Date(
            new Date(file.dateOfAssign).getTime() +
              dueDays * 24 * 60 * 60 * 1000
          )
        : null;

      sheet.addRow([
        no,
        (file.vehicleNo || "").toUpperCase(),
        file.dateOfAssign
          ? new Date(file.dateOfAssign).toLocaleDateString("en-GB")
          : "",
        aging,
        branchMap[file.branch] || "",
        getAasbRef(file),
        (subDeptMap[file.subRefType] || "").toUpperCase(),
        (stageMap[file.fileStatus] || file.fileStatus || "").toUpperCase(),
        adjusterMap[file.adjuster] || "",
        insurerMap[file.insurer] || "",
        file.claimNo || "",
        "", // REMARKS column left empty
        tatValue,
        file.dateEndInv
          ? new Date(file.dateEndInv).toLocaleDateString("en-GB")
          : "",
      ]);
      const dataRow = sheet.getRow(rowIdx);
      dataRow.height = 18;
      for (let col = 1; col <= 14; col++) {
        dataRow.getCell(col).font = { name: "Calibri", size: 10, bold: false };
        if (col === 1 || col === 4 || col === 13) {
          dataRow.getCell(col).alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        } else {
          dataRow.getCell(col).alignment = {
            vertical: "middle",
            horizontal: "left",
          };
        }
        dataRow.getCell(col).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (
          col === 13 &&
          hasTat &&
          typeof tatValue === "number" &&
          tatValue < 0
        ) {
          dataRow.getCell(col).font = {
            name: "Calibri",
            size: 10,
            bold: false,
            color: { argb: "FFFF0000" },
          };
        }
        if (
          col === 4 &&
          hasTat &&
          typeof tatValue === "number" &&
          tatValue < 0
        ) {
          dataRow.getCell(col).font = {
            name: "Calibri",
            size: 10,
            bold: false,
            color: { argb: "FFFFFFFF" },
          };
          dataRow.getCell(col).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFF0000" },
          };
        }
      }
      rowIdx++;
      no++;
    });

    // Set column widths
    const colWidths = [6, 14, 12, 8, 18, 26, 10, 12, 18, 18, 18, 18, 8, 12];
    colWidths.forEach((w, idx) => (sheet.getColumn(idx + 1).width = w));

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ClosedByAdjuster_${adjusterId}_${
        month || startDate + "_" + endDate
      }.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
