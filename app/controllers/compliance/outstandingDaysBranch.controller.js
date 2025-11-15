const db = require("../../models");
const ExcelJS = require("exceljs");

// Outstanding Assignment by Days (Branch) - API
exports.getOutstandingDaysBranch = async (req, res) => {
  try {
    const { month, deptId } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const endDate = `${month}-31`;

    // Get all branches
    const branches = await db.branch.findAll({ attributes: ["id", "name"] });
    const branchMap = {};
    branches.forEach((b) => {
      branchMap[String(b.id)] = b.name;
    });

    // Build where clause for outstanding files
    const where = {
      fileStatus: { [db.Sequelize.Op.notIn]: ["CLO", "CLOSED", "CANC"] },
      dateOfAssign: { [db.Sequelize.Op.lte]: endDate },
      ...(deptId && deptId !== "all" && { refType: deptId }),
    };

    // Get all outstanding (not closed) files assigned at any time, not closed as of end of month
    const files = await db.casefiles.findAll({
      where,
      attributes: ["branch", "dateOfAssign", "id"],
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
      if (file.dateOfAssign) {
        days = Math.abs(
          Math.floor(
            (new Date(endDate) - new Date(file.dateOfAssign)) /
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

// Outstanding Assignment by Days (Branch) - Excel Export
exports.exportOutstandingDaysBranch = async (req, res) => {
  try {
    const { month, deptId } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const endDate = `${month}-31`;

    // Get department name for title
    let deptName = "TPBI";
    if (deptId === "all" || deptId === "" || deptId === null) {
      deptName = "ALL DEPARTMENTS";
    } else if (deptId) {
      const dept = await db.dept.findByPk(deptId);
      if (dept && dept.name) deptName = dept.name;
    }

    const branches = await db.branch.findAll({ attributes: ["id", "name"] });
    const branchMap = {};
    branches.forEach((b) => {
      branchMap[String(b.id)] = b.name;
    });

    const where = {
      fileStatus: { [db.Sequelize.Op.notIn]: ["CLO", "CLOSED", "CANC"] },
      dateOfAssign: { [db.Sequelize.Op.lte]: endDate },
      ...(deptId && deptId !== "all" && { refType: deptId }),
    };

    const files = await db.casefiles.findAll({
      where,
      attributes: ["branch", "dateOfAssign", "id"],
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
      if (file.dateOfAssign) {
        days = Math.abs(
          Math.floor(
            (new Date(endDate) - new Date(file.dateOfAssign)) /
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

    // Excel generation
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Outstanding By Days (Branch)");

    // --- Title row ---
    const monthObj = new Date(`${month}-31`);
    const monthName = monthObj
      .toLocaleString("default", { month: "long" })
      .toUpperCase();
    const year = monthObj.getFullYear();
    const titleText = `${deptName.toUpperCase()} OUTSTANDING BY DAYS - BRANCH - AS OF ${monthObj.getDate()} ${monthName} ${year}`;
    sheet.addRow([titleText]);
    sheet.mergeCells("A1:G1");
    const titleRow = sheet.getRow(1);
    titleRow.height = 32;
    titleRow.getCell(1).font = { name: "Calibri", size: 12, bold: true };
    titleRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // --- Header row ---
    const headerValues = [
      "BRANCH",
      "OUTSTANDING BELOW 30 DAYS",
      "OUTSTANDING ABOVE 30 DAYS",
      "OUTSTANDING ABOVE 45 DAYS",
      "OUTSTANDING ABOVE 60 DAYS",
      "OUTSTANDING ABOVE 90 DAYS",
      `TOTAL AS AT ${monthObj.toLocaleDateString("en-GB")}`,
    ];
    sheet.addRow(headerValues);
    const headerRow = sheet.getRow(2);
    headerRow.height = 41.25;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF002060" },
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
        row.branch.toUpperCase(),
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
      dataRow.getCell(1).font = { name: "Calibri", size: 11, bold: true };
      for (let col = 2; col <= 7; col++) {
        dataRow.getCell(col).font = { name: "Calibri", size: 11, bold: false };
      }
      dataRow.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      rowIdx++;
    });

    // --- Total row ---
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
        fgColor: { argb: "FF002060" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.value = String(cell.value).toUpperCase();
    });

    // --- "NEW FILES" row ---
    sheet.addRow(["", "", "", "", "", "NEW FILES", ""]);
    const newFilesRow = sheet.getRow(rowIdx + 1);
    newFilesRow.height = 18;
    newFilesRow.getCell(6).font = { name: "Calibri", size: 11, bold: true };
    newFilesRow.getCell(6).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // --- "GRAND TOTAL" row ---
    sheet.addRow(["", "", "", "", "", "GRAND TOTAL", totals.total]);
    const grandTotalRow = sheet.getRow(rowIdx + 2);
    grandTotalRow.height = 18;
    grandTotalRow.getCell(6).font = { name: "Calibri", size: 11, bold: true };
    grandTotalRow.getCell(6).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    grandTotalRow.getCell(7).font = { name: "Calibri", size: 11, bold: true };
    grandTotalRow.getCell(7).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // --- Set column widths ---
    sheet.getColumn(1).width = 28;
    for (let i = 2; i <= 7; i++) {
      sheet.getColumn(i).width = 18;
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=OutstandingDays_Branch_${month}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
