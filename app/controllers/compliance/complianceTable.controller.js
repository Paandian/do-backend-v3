const db = require("../../models");
const ExcelJS = require("exceljs");

// Remove static BRANCH_CODES

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

    // Get all branches, sorted by brCode alphabetically
    const branches = await db.branch.findAll({
      attributes: ["id", "name", "brCode"],
      order: [["brCode", "ASC"]],
    });
    // Build branch code list and map
    const BRANCH_CODES = branches.map((b) => b.brCode);
    const branchCodeMap = {};
    branches.forEach((b) => {
      branchCodeMap[b.id] = b.brCode;
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
      stats[code] = { complied: 0, notComplied: 0, total: 0 };
    });
    let totalComplied = 0,
      totalNotComplied = 0,
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
        stats[branchCode].complied += 1;
        totalComplied += 1;
      } else {
        stats[branchCode].notComplied += 1;
        totalNotComplied += 1;
      }
      stats[branchCode].total += 1;
      totalFiles += 1;
    });

    // Prepare complied % row
    const compliedPercents = BRANCH_CODES.map((code) => {
      const s = stats[code];
      return s.total > 0 ? ((s.complied / s.total) * 100).toFixed(2) : "0.00";
    });
    const overallPercent =
      totalFiles > 0 ? ((totalComplied / totalFiles) * 100).toFixed(2) : "0.00";

    // Excel generation
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Compliance Table");

    // Calculate dynamic width for merged cells (number of columns)
    const totalCols = BRANCH_CODES.length + 2; // 1 for label, 1 for TOTAL

    // Header row (row 1)
    sheet.addRow([
      insurerName,
      `COMPLIANCE RATIO - ${new Date(startDate)
        .toLocaleString("default", { month: "long", year: "numeric" })
        .toUpperCase()}`,
      // ...fill empty cells to match totalCols...
      ...Array(totalCols - 2).fill(""),
    ]);
    sheet.mergeCells(`A1:${String.fromCharCode(65 + totalCols - 1)}1`);
    sheet.getRow(1).height = 29;
    sheet.getCell("A1").font = { name: "Calibri", size: 14, bold: true };
    sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

    // Empty row for spacing
    sheet.addRow([]);

    // Data column title (row 3)
    sheet.addRow([
      `${deptName} FULL ASSIGNMENT COMPLIANCE RATIO - BASED ON CLOSED FILES`,
      ...Array(totalCols - 1).fill(""),
    ]);
    sheet.mergeCells(`A3:${String.fromCharCode(65 + totalCols - 1)}3`);
    const titleRow = sheet.getRow(3);
    titleRow.height = 31.5;
    titleRow.getCell(1).font = { name: "Verdana", size: 11, bold: true };
    titleRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    // Set background color for all merged cells in row 3
    for (let i = 1; i <= totalCols; i++) {
      titleRow.getCell(i).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF92D050" },
      };
    }

    // Data column header (row 4, starts at col 2)
    const headerRowValues = ["", ...BRANCH_CODES, "TOTAL"];
    sheet.addRow(headerRowValues);
    const headerRow = sheet.getRow(4);
    headerRow.height = 24.5;
    for (let i = 2; i <= totalCols; i++) {
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
    // Row 5: Complied
    const compliedRow = ["Complied"];
    BRANCH_CODES.forEach((code) => compliedRow.push(stats[code].complied));
    compliedRow.push(totalComplied);
    sheet.addRow(compliedRow);
    const compliedRowObj = sheet.getRow(5);
    compliedRowObj.height = 18;
    for (let i = 2; i <= totalCols; i++) {
      compliedRowObj.getCell(i).font = {
        name: "Tahoma",
        size: 11,
        bold: true,
        color: { argb: "FF000000" },
      };
      compliedRowObj.getCell(i).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }

    // Row 6: Not Complied
    const notCompliedRow = ["Not Complied"];
    BRANCH_CODES.forEach((code) =>
      notCompliedRow.push(stats[code].notComplied)
    );
    notCompliedRow.push(totalNotComplied);
    sheet.addRow(notCompliedRow);
    const notCompliedRowObj = sheet.getRow(6);
    notCompliedRowObj.height = 18;
    for (let i = 2; i <= totalCols; i++) {
      notCompliedRowObj.getCell(i).font = {
        name: "Tahoma",
        size: 11,
        bold: false,
        color: { argb: "FFFF0000" },
      };
      notCompliedRowObj.getCell(i).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }

    // Row 7: Total
    const totalRow = ["Total"];
    BRANCH_CODES.forEach((code) => totalRow.push(stats[code].total));
    totalRow.push(totalFiles);
    sheet.addRow(totalRow);
    const totalRowObj = sheet.getRow(7);
    totalRowObj.height = 18;
    for (let i = 2; i <= totalCols; i++) {
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

    // Row 8: Complied %
    const percentRow = ["Complied %"];
    BRANCH_CODES.forEach((code, idx) => {
      const percent = compliedPercents[idx];
      percentRow.push(percent);
    });
    percentRow.push(overallPercent);
    sheet.addRow(percentRow);
    const percentRowObj = sheet.getRow(8);
    percentRowObj.height = 18;
    for (let i = 2; i <= totalCols; i++) {
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

    // Row 9: TAT and Overall Ratio
    sheet.addRow([]);
    const tatRow = sheet.getRow(9);
    tatRow.height = 29;
    tatRow.getCell(1).value = `TAT - FULL - ${tatMax} CALENDAR DAYS`;
    tatRow.getCell(1).font = { name: "Tahoma", size: 14, bold: true };
    tatRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    // Set background color for all occupied cells in row 9
    for (let i = 1; i <= totalCols; i++) {
      tatRow.getCell(i).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEBF1DE" },
      };
    }
    sheet.mergeCells(`A9:G9`);

    tatRow.getCell(8).value = "OVERALL RATIO";
    tatRow.getCell(8).font = { name: "Tahoma", size: 14, bold: true };
    tatRow.getCell(8).alignment = { vertical: "middle", horizontal: "left" };
    // No need to set fill again, already set above
    sheet.mergeCells(`H9:L9`);

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
    // No need to set fill again, already set above

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
