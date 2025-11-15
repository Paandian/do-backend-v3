const db = require("../../models");
const ExcelJS = require("exceljs");

// Helper: get branch codes in order
const BRANCH_CODES = [
  "KLHQ",
  "TAKAFUL",
  "SP",
  "PG",
  "IP",
  "KTN",
  "KB",
  "MK",
  "JB",
  "KK",
  "KCH",
];

exports.exportComplianceTable = async (req, res) => {
  try {
    const { insurerId, deptId, fileClass, month } = req.query;
    if (!insurerId || !deptId || !month) {
      return res.status(400).json({ message: "Missing required parameters" });
    }
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    // Get insurer name
    const insurer = await db.inss.findByPk(insurerId);
    const insurerName = insurer ? insurer.name.toUpperCase() : "INSURER";

    // Get department name
    const dept = await db.dept.findByPk(deptId);
    const deptName = dept ? dept.name.toUpperCase() : "DEPARTMENT";

    // Get TAT chart for this insurer and department
    const tatChart = await db.tatchart.findOne({
      where: { insId: insurerId, subDeptId: deptId },
    });
    const tatMax = tatChart ? tatChart.tatMax : 42;

    // Get all branches
    const branches = await db.branch.findAll({
      attributes: ["id", "name", "brCode"],
    });
    const branchCodeMap = {};
    branches.forEach((b) => {
      branchCodeMap[b.id] =
        b.brCode ||
        b.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase();
    });

    // Get closed files for the month, insurer, department, fileClass
    const where = {
      fileStatus: { [db.Sequelize.Op.in]: ["CLO", "CLOSED"] },
      insurer: insurerId,
      refType: deptId,
      dateClosed: { [db.Sequelize.Op.between]: [startDate, endDate] },
    };
    // Use subRefType for file classification filter
    if (fileClass && fileClass !== "all") {
      where.subRefType = fileClass;
    }
    const files = await db.casefiles.findAll({
      where,
      attributes: ["branch", "dateOfAssign", "dateClosed", "id"],
    });

    // Prepare stats per branch
    const stats = {};
    BRANCH_CODES.forEach((code) => {
      stats[code] = { compiled: 0, notCompiled: 0, total: 0 };
    });
    let totalCompiled = 0,
      totalNotCompiled = 0,
      totalFiles = 0;

    files.forEach((file) => {
      const branchCode = branchCodeMap[file.branch] || "UNKNOWN";
      if (!BRANCH_CODES.includes(branchCode)) return;
      let days = 0;
      if (file.dateOfAssign && file.dateClosed) {
        days = Math.abs(
          Math.floor(
            (new Date(file.dateClosed) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        );
      }
      if (days <= tatMax) {
        stats[branchCode].compiled += 1;
        totalCompiled += 1;
      } else {
        stats[branchCode].notCompiled += 1;
        totalNotCompiled += 1;
      }
      stats[branchCode].total += 1;
      totalFiles += 1;
    });

    // Prepare compiled % row
    const compiledPercents = BRANCH_CODES.map((code) => {
      const s = stats[code];
      return s.total > 0 ? ((s.compiled / s.total) * 100).toFixed(2) : "0.00";
    });
    const overallPercent =
      totalFiles > 0 ? ((totalCompiled / totalFiles) * 100).toFixed(2) : "0.00";

    // Excel generation
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Compliance Table");

    // Header row (row 1)
    sheet.addRow([
      insurerName,
      `COMPLIANCE RATIO - ${new Date(startDate)
        .toLocaleString("default", { month: "long", year: "numeric" })
        .toUpperCase()}`,
    ]);
    sheet.mergeCells("A1:L1");
    sheet.getRow(1).height = 29;
    sheet.getCell("A1").font = { name: "Calibri", size: 14, bold: true };
    sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
    sheet.getCell("B1").font = { name: "Calibri", size: 14, bold: true };
    sheet.getCell("B1").alignment = { vertical: "middle", horizontal: "right" };

    // Empty rows for spacing
    sheet.addRow([]);
    sheet.addRow([]);
    sheet.addRow([]);
    sheet.addRow([]);

    // Data column title (row 7)
    sheet.addRow([
      `${deptName} FULL ASSIGNMENT COMPLIANCE RATIO - BASED ON CLOSED FILES`,
    ]);
    sheet.mergeCells("A7:L7");
    const titleRow = sheet.getRow(7);
    titleRow.height = 31.5;
    titleRow.getCell(1).font = { name: "Verdana", size: 11, bold: true };
    titleRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    titleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF92D050" },
    };

    // Data column header (row 8, starts at col 2)
    const headerRowValues = ["", ...BRANCH_CODES, "TOTAL"];
    sheet.addRow(headerRowValues);
    const headerRow = sheet.getRow(8);
    headerRow.height = 24.5;
    for (let i = 2; i <= BRANCH_CODES.length + 2; i++) {
      const cell = headerRow.getCell(i);
      cell.font = { name: "Tahoma", size: 11, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEBF1DE" },
      };
      cell.value = String(cell.value).toUpperCase();
    }

    // Data rows
    // Row 9: Compiled
    const compiledRow = ["Compiled"];
    BRANCH_CODES.forEach((code) => compiledRow.push(stats[code].compiled));
    compiledRow.push(totalCompiled);
    sheet.addRow(compiledRow);
    const compiledRowObj = sheet.getRow(9);
    compiledRowObj.height = 18;
    for (let i = 2; i <= BRANCH_CODES.length + 2; i++) {
      compiledRowObj.getCell(i).font = {
        name: "Tahoma",
        size: 11,
        bold: true,
        color: { argb: "FF000000" },
      };
      compiledRowObj.getCell(i).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }

    // Row 10: Not Compiled
    const notCompiledRow = ["Not Compiled"];
    BRANCH_CODES.forEach((code) =>
      notCompiledRow.push(stats[code].notCompiled)
    );
    notCompiledRow.push(totalNotCompiled);
    sheet.addRow(notCompiledRow);
    const notCompiledRowObj = sheet.getRow(10);
    notCompiledRowObj.height = 18;
    for (let i = 2; i <= BRANCH_CODES.length + 2; i++) {
      notCompiledRowObj.getCell(i).font = {
        name: "Tahoma",
        size: 11,
        bold: false,
        color: { argb: "FFFF0000" },
      };
      notCompiledRowObj.getCell(i).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }

    // Row 11: Total
    const totalRow = ["Total"];
    BRANCH_CODES.forEach((code) => totalRow.push(stats[code].total));
    totalRow.push(totalFiles);
    sheet.addRow(totalRow);
    const totalRowObj = sheet.getRow(11);
    totalRowObj.height = 18;
    for (let i = 2; i <= BRANCH_CODES.length + 2; i++) {
      totalRowObj.getCell(i).font = {
        name: "Tahoma",
        size: 11,
        bold: true,
        color: { argb: "FF000000" },
      };
      totalRowObj.getCell(i).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }

    // Row 12: Compiled %
    const percentRow = ["Compiled %"];
    BRANCH_CODES.forEach((code, idx) => {
      const percent = compiledPercents[idx];
      percentRow.push(percent);
    });
    percentRow.push(overallPercent);
    sheet.addRow(percentRow);
    const percentRowObj = sheet.getRow(12);
    percentRowObj.height = 18;
    for (let i = 2; i <= BRANCH_CODES.length + 2; i++) {
      const percent = parseFloat(percentRowObj.getCell(i).value);
      percentRowObj.getCell(i).font = {
        name: "Tahoma",
        size: 11,
        bold: true,
        color: percent < 80 ? { argb: "FFFF0000" } : { argb: "FF000000" },
      };
      percentRowObj.getCell(i).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }

    // Row 13: TAT and Overall Ratio
    sheet.addRow([]);
    const tatRow = sheet.getRow(13);
    tatRow.height = 29;
    tatRow.getCell(1).value = `TAT - FULL - ${tatMax} CALENDAR DAYS`;
    tatRow.getCell(1).font = { name: "Tahoma", size: 14, bold: true };
    tatRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    tatRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEBF1DE" },
    };
    sheet.mergeCells(`A13:G13`);

    tatRow.getCell(8).value = "OVERALL RATIO";
    tatRow.getCell(8).font = { name: "Tahoma", size: 14, bold: true };
    tatRow.getCell(8).alignment = { vertical: "middle", horizontal: "center" };
    tatRow.getCell(8).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEBF1DE" },
    };

    tatRow.getCell(BRANCH_CODES.length + 2).value = overallPercent;
    tatRow.getCell(BRANCH_CODES.length + 2).font = {
      name: "Tahoma",
      size: 14,
      bold: true,
    };
    tatRow.getCell(BRANCH_CODES.length + 2).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Set column widths
    for (let i = 1; i <= BRANCH_CODES.length + 2; i++) {
      sheet.getColumn(i).width = i === 1 ? 28 : 14;
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ComplianceTable_${insurerName}_${deptName}_${month}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
