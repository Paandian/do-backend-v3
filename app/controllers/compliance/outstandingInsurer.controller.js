const db = require("../../models");
const ExcelJS = require("exceljs");
const Op = db.Sequelize.Op;

// Outstanding Assignment (By Insurer) - API
exports.getOutstandingInsurer = async (req, res) => {
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

    // Get all TAT charts (for compliance days)
    const tatCharts = await db.tatchart.findAll();
    const tatMap = {};
    tatCharts.forEach((t) => {
      tatMap[`${String(t.insId)}-${String(t.subDeptId)}`] = t.tatMax;
    });

    // Build where clause
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
            withinTat: 0,
            breachedTat: 0,
            total: 0,
          },
          details: {},
        };

      const subRefTypeId = String(file.subRefType || "");
      const tatKey = `${insurerId}-${subRefTypeId}`;
      const tatMax = tatMap.hasOwnProperty(tatKey) ? tatMap[tatKey] : null;
      let days = 0;
      if (file.dateOfAssign) {
        days = Math.abs(
          Math.floor(
            (new Date(endDate) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        );
      }
      let isWithinTat =
        tatMax === null || typeof tatMax === "undefined" || days <= tatMax;
      if (isWithinTat) result[insurerId].summary.withinTat += 1;
      else result[insurerId].summary.breachedTat += 1;
      result[insurerId].summary.total += 1;

      // Details by dept/classification
      const deptKey = String(file.refType || "");
      const classKey = String(file.subRefType || "");
      const detailKey = `${deptKey}-${classKey}`;
      if (!result[insurerId].details[detailKey]) {
        result[insurerId].details[detailKey] = {
          dept: deptMap[deptKey] || deptKey,
          class: subDeptMap[classKey] || classKey,
          withinTat: 0,
          breachedTat: 0,
          total: 0,
        };
      }
      if (isWithinTat) result[insurerId].details[detailKey].withinTat += 1;
      else result[insurerId].details[detailKey].breachedTat += 1;
      result[insurerId].details[detailKey].total += 1;
    });

    // Prepare reportData
    const reportData = Object.entries(result)
      .map(([insurerId, data]) => {
        const percent =
          data.summary.total > 0
            ? ((data.summary.breachedTat / data.summary.total) * 100).toFixed(2)
            : "0.00";
        return {
          insurer: insurerMap[insurerId]?.name || "Unknown",
          insurerCode: insurerMap[insurerId]?.code || insurerId,
          withinTat: data.summary.withinTat,
          breachedTat: data.summary.breachedTat,
          total: data.summary.total,
          percent: percent,
          details: Object.values(data.details).map((detail) => ({
            ...detail,
            percent:
              detail.total > 0
                ? ((detail.breachedTat / detail.total) * 100).toFixed(2)
                : "0.00",
          })),
        };
      })
      .sort((a, b) => a.insurerCode.localeCompare(b.insurerCode));

    res.json({ reportData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Outstanding Assignment (By Insurer) - Excel Export
exports.exportOutstandingInsurer = async (req, res) => {
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

    // Get all TAT charts (for compliance days)
    const tatCharts = await db.tatchart.findAll();
    const tatMap = {};
    tatCharts.forEach((t) => {
      tatMap[`${String(t.insId)}-${String(t.subDeptId)}`] = t.tatMax;
    });

    // Build where clause
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
            withinTat: 0,
            breachedTat: 0,
            total: 0,
          },
          details: {},
        };

      const subRefTypeId = String(file.subRefType || "");
      const tatKey = `${insurerId}-${subRefTypeId}`;
      const tatMax = tatMap.hasOwnProperty(tatKey) ? tatMap[tatKey] : null;
      let days = 0;
      if (file.dateOfAssign) {
        days = Math.abs(
          Math.floor(
            (new Date(endDate) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        );
      }
      let isWithinTat =
        tatMax === null || typeof tatMax === "undefined" || days <= tatMax;
      if (isWithinTat) result[insurerId].summary.withinTat += 1;
      else result[insurerId].summary.breachedTat += 1;
      result[insurerId].summary.total += 1;

      // Details by dept/classification
      const deptKey = String(file.refType || "");
      const classKey = String(file.subRefType || "");
      const detailKey = `${deptKey}-${classKey}`;
      if (!result[insurerId].details[detailKey]) {
        result[insurerId].details[detailKey] = {
          dept: deptMap[deptKey] || deptKey,
          class: subDeptMap[classKey] || classKey,
          withinTat: 0,
          breachedTat: 0,
          total: 0,
        };
      }
      if (isWithinTat) result[insurerId].details[detailKey].withinTat += 1;
      else result[insurerId].details[detailKey].breachedTat += 1;
      result[insurerId].details[detailKey].total += 1;
    });

    // Prepare reportData
    const reportData = Object.entries(result)
      .map(([insurerId, data]) => {
        const percent =
          data.summary.total > 0
            ? ((data.summary.breachedTat / data.summary.total) * 100).toFixed(2)
            : "0.00";
        return {
          insurer: insurerMap[insurerId]?.name || "Unknown",
          insurerCode: insurerMap[insurerId]?.code || insurerId,
          withinTat: data.summary.withinTat,
          breachedTat: data.summary.breachedTat,
          total: data.summary.total,
          percent: percent,
          details: Object.values(data.details).map((detail) => ({
            ...detail,
            percent:
              detail.total > 0
                ? ((detail.breachedTat / detail.total) * 100).toFixed(2)
                : "0.00",
          })),
        };
      })
      .sort((a, b) => a.insurerCode.localeCompare(b.insurerCode));

    // Excel generation
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Outstanding (Insurer)");
    const totalCols = 5;
    const lastColLetter = String.fromCharCode(64 + totalCols); // E

    // --- Title row ---
    const monthObj = new Date(`${month}-31`);
    const monthName = monthObj
      .toLocaleString("default", { month: "long" })
      .toUpperCase();
    const year = monthObj.getFullYear();
    const reportDate = new Date();
    const reportDateStr = reportDate.toLocaleDateString("en-GB");
    const titleText = `OUTSTANDING ASSIGNMENT SUMMARY ${monthName} ${year} - BY INSURER (Report generated: ${reportDateStr})`;
    sheet.addRow([titleText, "", "", "", ""]);
    sheet.mergeCells(`A1:${lastColLetter}1`);
    const titleRow = sheet.getRow(1);
    titleRow.height = 32;
    titleRow.getCell(1).font = { name: "Tahoma", size: 12, bold: true };
    titleRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    titleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF76933C" },
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
    headerRow.height = 35;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: "Tahoma",
        size: 12,
        bold: true,
        color: { argb: "FF000000" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEDEDED" },
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
    let totalWithinTat = 0,
      totalBreachedTat = 0,
      totalFiles = 0;
    for (const row of reportData) {
      totalWithinTat += row.withinTat;
      totalBreachedTat += row.breachedTat;
      totalFiles += row.total;
      sheet.addRow([
        String(row.insurerCode || row.insurer).toUpperCase(),
        row.withinTat,
        row.breachedTat,
        row.total,
        row.percent,
      ]);
      const dataRow = sheet.getRow(rowIdx);
      dataRow.height = 18;
      dataRow.getCell(1).font = { name: "Tahoma", size: 12, bold: true };
      dataRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
      for (let col = 2; col <= 5; col++) {
        dataRow.getCell(col).font = { name: "Tahoma", size: 12, bold: true };
        dataRow.getCell(col).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      }
      dataRow.getCell(3).font = {
        name: "Tahoma",
        size: 12,
        bold: true,
        color: { argb: "FFFF0000" },
      };
      // Breach % color
      const breachPercent = parseFloat(row.percent);
      if (breachPercent > 80) {
        dataRow.getCell(5).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFF6600" }, // dark orange
        };
      } else if (breachPercent >= 50) {
        dataRow.getCell(5).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFB366" }, // light orange
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
        sheet.addRow([
          `${String(row.insurerCode || row.insurer).toUpperCase()} (${
            detail.dept
          } - ${detail.class})`,
          detail.withinTat,
          detail.breachedTat,
          detail.total,
          detail.percent,
        ]);
        const detailRow = sheet.getRow(rowIdx);
        detailRow.height = 18;
        detailRow.getCell(1).font = { name: "Tahoma", size: 12, bold: false };
        detailRow.getCell(1).alignment = {
          vertical: "middle",
          horizontal: "left",
        };
        for (let col = 2; col <= 5; col++) {
          detailRow.getCell(col).font = {
            name: "Tahoma",
            size: 12,
            bold: false,
          };
          detailRow.getCell(col).alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        }
        detailRow.getCell(3).font = {
          name: "Tahoma",
          size: 12,
          bold: true,
          color: { argb: "FFFF0000" },
        };
        // Breach % color for detail
        const breachPercentDetail = parseFloat(detail.percent);
        if (breachPercentDetail > 80) {
          detailRow.getCell(5).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFF6600" },
          };
        } else if (breachPercentDetail >= 50) {
          detailRow.getCell(5).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFB366" },
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
    const overallBreachPercent =
      totalFiles > 0
        ? ((totalBreachedTat / totalFiles) * 100).toFixed(2)
        : "0.00";
    sheet.addRow([
      "TOTAL",
      totalWithinTat,
      totalBreachedTat,
      totalFiles,
      overallBreachPercent,
    ]);
    const totalRow = sheet.getRow(rowIdx);
    totalRow.height = 18;
    totalRow.getCell(1).font = { name: "Tahoma", size: 13, bold: true };
    totalRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    for (let col = 2; col <= 5; col++) {
      totalRow.getCell(col).font = { name: "Tahoma", size: 13, bold: true };
      totalRow.getCell(col).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }
    totalRow.getCell(3).font = {
      name: "Tahoma",
      size: 13,
      bold: true,
      color: { argb: "FFFF0000" },
    };
    totalRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "medium" },
        left: { style: "thin" },
        bottom: { style: "medium" },
        right: { style: "thin" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEDEDED" },
      };
    });

    // Set column widths
    for (let i = 1; i <= totalCols; i++) {
      sheet.getColumn(i).width = i === 1 ? 28 : 18;
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
