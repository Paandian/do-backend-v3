const db = require("../../models");
const ExcelJS = require("exceljs");
const Op = db.Sequelize.Op;

// Outstanding Assignment by Days (Insurer) - API
exports.getOutstandingDaysInsurer = async (req, res) => {
  try {
    const { month, deptId, classificationId } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const endDate = `${month}-31`;

    // Get all insurers
    const insurers = await db.inss.findAll({
      attributes: ["id", "name", "insCode"],
    });
    const insurerMap = {};
    insurers.forEach((ins) => {
      insurerMap[String(ins.id)] = {
        name: ins.name,
        code: ins.insCode || ins.name,
      };
    });

    // Get all departments and classifications
    const depts = await db.dept.findAll({ attributes: ["id", "name"] });
    const deptMap = {};
    depts.forEach((d) => {
      deptMap[String(d.id)] = d.name;
    });

    const subDepts = await db.subDept.findAll({
      attributes: ["id", "subCode"],
    });
    const subDeptMap = {};
    subDepts.forEach((sd) => {
      subDeptMap[String(sd.id)] = sd.subCode;
    });

    // Build where clause for outstanding files
    const where = {
      fileStatus: { [Op.notIn]: ["CLO", "CLOSED", "CANC"] },
      dateOfAssign: { [Op.lte]: endDate },
      ...(deptId && deptId !== "all" && { refType: deptId }),
      ...(classificationId &&
        classificationId !== "all" && { subRefType: classificationId }),
    };

    // Get all outstanding (not closed) files assigned at any time, not closed as of end of month
    const files = await db.casefiles.findAll({
      where,
      attributes: ["insurer", "refType", "subRefType", "dateOfAssign", "id"],
    });

    // Grouping logic
    const result = {};
    files.forEach((file) => {
      const insurerId = String(file.insurer);
      if (!result[insurerId])
        result[insurerId] = {
          summary: {
            below30: 0,
            above30: 0,
            above45: 0,
            above60: 0,
            above90: 0,
            total: 0,
          },
          details: {},
        };

      let days = 0;
      if (file.dateOfAssign) {
        days = Math.abs(
          Math.floor(
            (new Date(endDate) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        );
      }
      let bucket = "";
      if (days < 30) bucket = "below30";
      else if (days >= 30 && days < 45) bucket = "above30";
      else if (days >= 45 && days < 60) bucket = "above45";
      else if (days >= 60 && days < 90) bucket = "above60";
      else if (days >= 90) bucket = "above90";

      // Summary
      result[insurerId].summary[bucket] += 1;
      result[insurerId].summary.total += 1;

      // Details by dept/classification
      const deptKey = String(file.refType || "");
      const classKey = String(file.subRefType || "");
      const detailKey = `${deptKey}-${classKey}`;
      if (!result[insurerId].details[detailKey]) {
        result[insurerId].details[detailKey] = {
          dept: deptMap[deptKey] || deptKey,
          class: subDeptMap[classKey] || classKey,
          below30: 0,
          above30: 0,
          above45: 0,
          above60: 0,
          above90: 0,
          total: 0,
        };
      }
      result[insurerId].details[detailKey][bucket] += 1;
      result[insurerId].details[detailKey].total += 1;
    });

    // Prepare reportData
    const reportData = Object.entries(result)
      .map(([insurerId, data]) => ({
        insurer: insurerMap[insurerId]?.name || "Unknown",
        insurerCode: insurerMap[insurerId]?.code || insurerId,
        ...data.summary,
        details: Object.values(data.details),
      }))
      .sort((a, b) => a.insurerCode.localeCompare(b.insurerCode));

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

// Outstanding Assignment by Days (Insurer) - Excel Export
exports.exportOutstandingDaysInsurer = async (req, res) => {
  try {
    const { month, deptId, classificationId } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const endDate = `${month}-31`;

    // Get all insurers (with insCode)
    const insurers = await db.inss.findAll({
      attributes: ["id", "name", "insCode"],
    });
    const insurerMap = {};
    insurers.forEach((ins) => {
      insurerMap[String(ins.id)] = {
        name: ins.name,
        code: ins.insCode || ins.name,
      };
    });

    // Get all departments and classifications
    const depts = await db.dept.findAll({ attributes: ["id", "name"] });
    const deptMap = {};
    depts.forEach((d) => {
      deptMap[String(d.id)] = d.name;
    });

    const subDepts = await db.subDept.findAll({
      attributes: ["id", "subCode"],
    });
    const subDeptMap = {};
    subDepts.forEach((sd) => {
      subDeptMap[String(sd.id)] = sd.subCode;
    });

    // Build where clause for outstanding files
    const where = {
      fileStatus: { [Op.notIn]: ["CLO", "CLOSED", "CANC"] },
      dateOfAssign: { [Op.lte]: endDate },
      ...(deptId && deptId !== "all" && { refType: deptId }),
      ...(classificationId &&
        classificationId !== "all" && { subRefType: classificationId }),
    };

    // Get all outstanding (not closed) files assigned at any time, not closed as of end of month
    const files = await db.casefiles.findAll({
      where,
      attributes: ["insurer", "refType", "subRefType", "dateOfAssign", "id"],
    });

    // Grouping logic (same as API)
    const result = {};
    files.forEach((file) => {
      const insurerId = String(file.insurer);
      if (!result[insurerId])
        result[insurerId] = {
          summary: {
            below30: 0,
            above30: 0,
            above45: 0,
            above60: 0,
            above90: 0,
            total: 0,
          },
          details: {},
        };

      let days = 0;
      if (file.dateOfAssign) {
        days = Math.abs(
          Math.floor(
            (new Date(endDate) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        );
      }
      let bucket = "";
      if (days < 30) bucket = "below30";
      else if (days >= 30 && days < 45) bucket = "above30";
      else if (days >= 45 && days < 60) bucket = "above45";
      else if (days >= 60 && days < 90) bucket = "above60";
      else if (days >= 90) bucket = "above90";

      // Summary
      result[insurerId].summary[bucket] += 1;
      result[insurerId].summary.total += 1;

      // Details by dept/classification
      const deptKey = String(file.refType || "");
      const classKey = String(file.subRefType || "");
      const detailKey = `${deptKey}-${classKey}`;
      if (!result[insurerId].details[detailKey]) {
        result[insurerId].details[detailKey] = {
          dept: deptMap[deptKey] || deptKey,
          class: subDeptMap[classKey] || classKey,
          below30: 0,
          above30: 0,
          above45: 0,
          above60: 0,
          above90: 0,
          total: 0,
        };
      }
      result[insurerId].details[detailKey][bucket] += 1;
      result[insurerId].details[detailKey].total += 1;
    });

    // Prepare reportData
    const reportData = Object.entries(result)
      .map(([insurerId, data]) => ({
        insurer: insurerMap[insurerId]?.name || "Unknown",
        insurerCode: insurerMap[insurerId]?.code || insurerId,
        ...data.summary,
        details: Object.values(data.details),
      }))
      .sort((a, b) => a.insurerCode.localeCompare(b.insurerCode));

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
    const sheet = workbook.addWorksheet("Outstanding By Days (Insurer)");
    const totalCols = 7;
    const lastColLetter = String.fromCharCode(64 + totalCols); // G

    // --- Title row ---
    const monthObj = new Date(`${month}-31`);
    const monthName = monthObj
      .toLocaleString("default", { month: "long" })
      .toUpperCase();
    const year = monthObj.getFullYear();
    const titleText = `OUTSTANDING BY DAYS - INSURER - AS OF ${monthObj.getDate()} ${monthName} ${year}`;
    sheet.addRow([titleText, "", "", "", "", "", ""]);
    sheet.mergeCells(`A1:${lastColLetter}1`);
    const titleRow = sheet.getRow(1);
    titleRow.height = 32;
    titleRow.getCell(1).font = { name: "Calibri", size: 12, bold: true };
    titleRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // --- Header row ---
    const headerValues = [
      "INSURER",
      "OUTSTANDING BELOW 30 DAYS",
      "OUTSTANDING ABOVE 30 DAYS",
      "OUTSTANDING ABOVE 45 DAYS",
      "OUTSTANDING ABOVE 60 DAYS",
      "OUTSTANDING ABOVE 90 DAYS",
      `TOTAL AS AT ${monthObj.toLocaleDateString("en-GB")}`,
    ];
    sheet.addRow(headerValues);
    const headerRow = sheet.getRow(2);
    headerRow.height = 35;
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

    let rowIdx = 3;
    for (const row of reportData) {
      // Summary row
      const values = [
        String(row.insurerCode || row.insurer).toUpperCase(),
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
      // Left align insurer column, bold
      dataRow.getCell(1).font = { name: "Calibri", size: 11, bold: true };
      dataRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
      for (let col = 2; col <= 7; col++) {
        dataRow.getCell(col).font = { name: "Calibri", size: 11, bold: false };
        dataRow.getCell(col).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      }
      dataRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      rowIdx++;

      // Detail rows
      for (const detail of row.details) {
        const detailLabel = `${String(
          row.insurerCode || row.insurer
        ).toUpperCase()} (${detail.dept} - ${detail.class})`;
        sheet.addRow([
          detailLabel,
          detail.below30,
          detail.above30,
          detail.above45,
          detail.above60,
          detail.above90,
          detail.total,
        ]);
        const detailRow = sheet.getRow(rowIdx);
        detailRow.height = 18;
        detailRow.getCell(1).font = { name: "Calibri", size: 11, bold: false };
        detailRow.getCell(1).alignment = {
          vertical: "middle",
          horizontal: "left",
        };
        for (let col = 2; col <= 7; col++) {
          detailRow.getCell(col).font = {
            name: "Calibri",
            size: 11,
            bold: false,
          };
          detailRow.getCell(col).alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        }
        detailRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
        rowIdx++;
      }
    }

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
    totalRow.getCell(1).font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    totalRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    for (let col = 2; col <= 7; col++) {
      totalRow.getCell(col).font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      totalRow.getCell(col).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }
    totalRow.eachCell((cell, colNumber) => {
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
    sheet.getColumn(1).width = 38;
    for (let i = 2; i <= 7; i++) {
      sheet.getColumn(i).width = 18;
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=OutstandingDays_Insurer_${month}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
