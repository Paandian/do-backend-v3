const db = require("../../models");
const ExcelJS = require("exceljs");

// Outstanding Assignment (By Insurer) - API
exports.getOutstandingInsurer = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    // Get all insurers
    const insurers = await db.inss.findAll({ attributes: ["id", "name"] });
    const insurerMap = {};
    insurers.forEach((ins) => {
      insurerMap[String(ins.id)] = ins.name;
    });

    // Get all TAT charts (for compliance days)
    const tatCharts = await db.tatchart.findAll();
    const tatMap = {};
    tatCharts.forEach((t) => {
      tatMap[`${String(t.insId)}-${String(t.subDeptId)}`] = t.tatMax;
    });

    // Get all outstanding (not closed) files assigned at any time, not closed as of end of month
    const files = await db.casefiles.findAll({
      where: {
        fileStatus: { [db.Sequelize.Op.notIn]: ["CLO", "CLOSED", "CANC"] },
        dateOfAssign: { [db.Sequelize.Op.lte]: endDate },
      },
      attributes: ["insurer", "subRefType", "dateOfAssign", "id"],
    });

    const result = {};
    files.forEach((file) => {
      if (
        file.insurer === null ||
        file.insurer === undefined ||
        file.subRefType === null ||
        file.subRefType === undefined ||
        file.insurer === "" ||
        file.subRefType === ""
      ) {
        return;
      }
      const insurerId = String(file.insurer);
      const subRefTypeId = String(file.subRefType);
      if (!result[insurerId]) {
        result[insurerId] = { withinTat: 0, breachedTat: 0, total: 0 };
      }
      const tatKey = `${insurerId}-${subRefTypeId}`;
      const tatDays = tatMap.hasOwnProperty(tatKey) ? tatMap[tatKey] : null;
      let days = 0;
      if (file.dateOfAssign) {
        days = Math.abs(
          Math.floor(
            (new Date(`${month}-31`) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        );
      }
      if (
        tatDays === null ||
        typeof tatDays === "undefined" ||
        days <= tatDays
      ) {
        result[insurerId].withinTat += 1;
      } else {
        result[insurerId].breachedTat += 1;
      }
      result[insurerId].total += 1;
    });

    const reportData = Object.entries(result)
      .map(([insurerId, counts]) => {
        const percent =
          counts.total > 0
            ? ((counts.withinTat / counts.total) * 100).toFixed(2)
            : "0.00";
        return {
          insurer: insurerMap[insurerId] || "Unknown",
          withinTat: counts.withinTat,
          breachedTat: counts.breachedTat,
          total: counts.total,
          percent: percent,
        };
      })
      .sort((a, b) => a.insurer.localeCompare(b.insurer));

    res.json({ reportData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Outstanding Assignment (By Insurer) - Excel Export
exports.exportOutstandingInsurer = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    // ...reuse logic from getOutstandingInsurer up to reportData...

    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const insurers = await db.inss.findAll({ attributes: ["id", "name"] });
    const insurerMap = {};
    insurers.forEach((ins) => {
      insurerMap[String(ins.id)] = ins.name;
    });

    const tatCharts = await db.tatchart.findAll();
    const tatMap = {};
    tatCharts.forEach((t) => {
      tatMap[`${String(t.insId)}-${String(t.subDeptId)}`] = t.tatMax;
    });

    const files = await db.casefiles.findAll({
      where: {
        fileStatus: { [db.Sequelize.Op.notIn]: ["CLO", "CLOSED", "CANC"] },
        dateOfAssign: { [db.Sequelize.Op.lte]: endDate },
      },
      attributes: ["insurer", "subRefType", "dateOfAssign", "id"],
    });

    const result = {};
    files.forEach((file) => {
      if (
        file.insurer === null ||
        file.insurer === undefined ||
        file.subRefType === null ||
        file.subRefType === undefined ||
        file.insurer === "" ||
        file.subRefType === ""
      ) {
        return;
      }
      const insurerId = String(file.insurer);
      const subRefTypeId = String(file.subRefType);
      if (!result[insurerId]) {
        result[insurerId] = { withinTat: 0, breachedTat: 0, total: 0 };
      }
      const tatKey = `${insurerId}-${subRefTypeId}`;
      const tatDays = tatMap.hasOwnProperty(tatKey) ? tatMap[tatKey] : null;
      let days = 0;
      if (file.dateOfAssign) {
        days = Math.abs(
          Math.floor(
            (new Date(`${month}-31`) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        );
      }
      if (
        tatDays === null ||
        typeof tatDays === "undefined" ||
        days <= tatDays
      ) {
        result[insurerId].withinTat += 1;
      } else {
        result[insurerId].breachedTat += 1;
      }
      result[insurerId].total += 1;
    });

    const reportData = Object.entries(result)
      .map(([insurerId, counts]) => {
        const percent =
          counts.total > 0
            ? ((counts.withinTat / counts.total) * 100).toFixed(2)
            : "0.00";
        return {
          insurer: insurerMap[insurerId] || "Unknown",
          withinTat: counts.withinTat,
          breachedTat: counts.breachedTat,
          total: counts.total,
          percent: percent,
        };
      })
      .sort((a, b) => a.insurer.localeCompare(b.insurer));

    // Excel generation
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Outstanding (Insurer)");

    // --- Table Title ---
    const monthObj = new Date(`${month}-31`);
    const monthName = monthObj
      .toLocaleString("default", { month: "long" })
      .toUpperCase();
    const year = monthObj.getFullYear();
    const titleText = `OUTSTANDING ASSIGNMENT SUMMARY ${monthName} ${year} - BY INSURER`;
    sheet.addRow([titleText]);
    sheet.mergeCells("A1:E1");
    const titleRow = sheet.getRow(1);
    titleRow.height = 41.25;
    titleRow.getCell(1).font = { name: "Calibri", size: 12, bold: true };
    titleRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // --- Header row ---
    const headerValues = [
      "INSURER",
      "WITHIN TAT",
      "TAT BREACH",
      "TOTAL",
      "BREACH PERCENTAGE",
    ];
    sheet.addRow(headerValues);
    const headerRow = sheet.getRow(2);
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: "Tahoma",
        size: 11,
        bold: true,
        color: { argb: "FF000000" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEDEDED" }, // #EDEDED
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
    let totalWithinTat = 0,
      totalBreachedTat = 0,
      totalFiles = 0;
    reportData.forEach((row) => {
      totalWithinTat += row.withinTat;
      totalBreachedTat += row.breachedTat;
      totalFiles += row.total;
      const values = [
        String(row.insurer).toUpperCase(),
        row.withinTat,
        row.breachedTat,
        row.total,
        row.percent,
      ];
      sheet.addRow(values);
      const dataRow = sheet.getRow(rowIdx);
      dataRow.height = 18;
      dataRow.getCell(1).font = { name: "Tahoma", size: 11, bold: false }; // Insurer name not bold
      for (let col = 2; col <= 5; col++) {
        dataRow.getCell(col).font = { name: "Tahoma", size: 11, bold: true };
      }
      // Breached TAT column (3rd col): red text
      dataRow.getCell(3).font = {
        name: "Tahoma",
        size: 11,
        bold: true,
        color: { argb: "FFFF0000" },
      };
      dataRow.eachCell((cell, colNumber) => {
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

    // Totals row
    const overallPercent =
      totalFiles > 0
        ? ((totalWithinTat / totalFiles) * 100).toFixed(2)
        : "0.00";
    sheet.addRow([
      "TOTAL",
      totalWithinTat,
      totalBreachedTat,
      totalFiles,
      overallPercent,
    ]);
    const totalRow = sheet.getRow(rowIdx);
    totalRow.height = 18;
    totalRow.getCell(1).font = { name: "Tahoma", size: 11, bold: true };
    totalRow.getCell(2).font = { name: "Tahoma", size: 11, bold: true };
    totalRow.getCell(3).font = {
      name: "Tahoma",
      size: 11,
      bold: true,
      color: { argb: "FFFF0000" },
    };
    totalRow.getCell(4).font = { name: "Tahoma", size: 11, bold: true };
    totalRow.getCell(5).font = { name: "Tahoma", size: 11, bold: true };
    totalRow.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.value = String(cell.value).toUpperCase();
    });

    // OVERALL RATIO row
    sheet.addRow(["OVERALL RATIO", "", "", "", overallPercent]);
    const overallRow = sheet.getRow(rowIdx + 1);
    overallRow.height = 39.75;
    // Merge first four columns
    sheet.mergeCells(`A${rowIdx + 1}:D${rowIdx + 1}`);
    // Style merged cell for "OVERALL RATIO"
    overallRow.getCell(1).font = { name: "Tahoma", size: 18, bold: true };
    overallRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    overallRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEDEDED" },
    };
    overallRow.getCell(1).value = "OVERALL RATIO";
    // Style the cell for the overall percent (column E)
    overallRow.getCell(5).font = { name: "Tahoma", size: 18, bold: true };
    overallRow.getCell(5).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    overallRow.getCell(5).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEDEDED" },
    };
    overallRow.getCell(5).value = overallPercent;

    // Set column widths
    sheet.getColumn(1).width = 28;
    for (let i = 2; i <= 5; i++) {
      sheet.getColumn(i).width = 18;
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Outstanding_Insurer_${month}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
