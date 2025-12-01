const db = require("../../models");
const ExcelJS = require("exceljs");
const Op = db.Sequelize.Op;

// Outstanding Assignment (By Branch) - API
exports.getOutstandingBranch = async (req, res) => {
  try {
    const { month, deptId, classificationId } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const endDate = `${month}-31`;

    // Get all branches
    const branches = await db.branch.findAll({
      attributes: ["id", "name", "brCode"],
    });
    const branchMap = {};
    branches.forEach((b) => {
      branchMap[String(b.id)] = { name: b.name, code: b.brCode || b.name };
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
    // Use insurer+classification as key, since TAT is not branch-based
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
      attributes: [
        "branch",
        "refType",
        "subRefType",
        "insurer",
        "dateOfAssign",
        "id",
      ],
    });

    // Grouping logic
    const result = {};
    files.forEach((file) => {
      const branchId = String(file.branch);
      if (!result[branchId])
        result[branchId] = {
          summary: {
            withinTat: 0,
            breachedTat: 0,
            total: 0,
          },
          details: {},
        };

      // Use insurer+classification for TAT lookup (like complianceRatioBranch)
      const insId = String(file.insurer || "");
      const classKey = String(file.subRefType || "");
      const tatKey = `${insId}-${classKey}`;
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
      if (isWithinTat) result[branchId].summary.withinTat += 1;
      else result[branchId].summary.breachedTat += 1;
      result[branchId].summary.total += 1;

      // Details by dept/classification
      const deptKey = String(file.refType || "");
      const detailKey = `${deptKey}-${classKey}`;
      if (!result[branchId].details[detailKey]) {
        result[branchId].details[detailKey] = {
          dept: deptMap[deptKey] || deptKey,
          class: subDeptMap[classKey] || classKey,
          withinTat: 0,
          breachedTat: 0,
          total: 0,
        };
      }
      if (isWithinTat) result[branchId].details[detailKey].withinTat += 1;
      else result[branchId].details[detailKey].breachedTat += 1;
      result[branchId].details[detailKey].total += 1;
    });

    // Prepare reportData
    const reportData = Object.entries(result)
      .map(([branchId, data]) => {
        const percent =
          data.summary.total > 0
            ? ((data.summary.breachedTat / data.summary.total) * 100).toFixed(2)
            : "0.00";
        return {
          branch: branchMap[branchId]?.name || "Unknown",
          branchCode: branchMap[branchId]?.code || branchId,
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
      .sort((a, b) => a.branchCode.localeCompare(b.branchCode));

    res.json({ reportData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Outstanding Assignment (By Branch) - Excel Export
exports.exportOutstandingBranch = async (req, res) => {
  try {
    const { month, deptId, classificationId } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const endDate = `${month}-31`;

    // Get all branches
    const branches = await db.branch.findAll({
      attributes: ["id", "name", "brCode"],
    });
    const branchMap = {};
    branches.forEach((b) => {
      branchMap[String(b.id)] = { name: b.name, code: b.brCode || b.name };
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
    // Use insurer+classification as key, since TAT is not branch-based
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
      attributes: [
        "branch",
        "refType",
        "subRefType",
        "insurer",
        "dateOfAssign",
        "id",
      ],
    });

    // Grouping logic
    const result = {};
    files.forEach((file) => {
      const branchId = String(file.branch);
      if (!result[branchId])
        result[branchId] = {
          summary: {
            withinTat: 0,
            breachedTat: 0,
            total: 0,
          },
          details: {},
        };

      // Use insurer+classification for TAT lookup (like complianceRatioBranch)
      const insId = String(file.insurer || "");
      const classKey = String(file.subRefType || "");
      const tatKey = `${insId}-${classKey}`;
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
      if (isWithinTat) result[branchId].summary.withinTat += 1;
      else result[branchId].summary.breachedTat += 1;
      result[branchId].summary.total += 1;

      // Details by dept/classification
      const deptKey = String(file.refType || "");
      const detailKey = `${deptKey}-${classKey}`;
      if (!result[branchId].details[detailKey]) {
        result[branchId].details[detailKey] = {
          dept: deptMap[deptKey] || deptKey,
          class: subDeptMap[classKey] || classKey,
          withinTat: 0,
          breachedTat: 0,
          total: 0,
        };
      }
      if (isWithinTat) result[branchId].details[detailKey].withinTat += 1;
      else result[branchId].details[detailKey].breachedTat += 1;
      result[branchId].details[detailKey].total += 1;
    });

    // Prepare reportData
    const reportData = Object.entries(result)
      .map(([branchId, data]) => {
        const percent =
          data.summary.total > 0
            ? ((data.summary.breachedTat / data.summary.total) * 100).toFixed(2)
            : "0.00";
        return {
          branch: branchMap[branchId]?.name || "Unknown",
          branchCode: branchMap[branchId]?.code || branchId,
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
      .sort((a, b) => a.branchCode.localeCompare(b.branchCode));

    // Excel generation
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Outstanding (Branch)");
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
    const titleText = `OUTSTANDING ASSIGNMENT SUMMARY ${monthName} ${year} - BY BRANCH (Report generated: ${reportDateStr})`;
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
      "BRANCH",
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
        String(row.branchCode || row.branch).toUpperCase(),
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
          `${String(row.branchCode || row.branch).toUpperCase()} (${
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
      `attachment; filename=Outstanding_Branch_${month}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
