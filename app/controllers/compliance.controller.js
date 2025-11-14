const db = require("../models");
const ExcelJS = require("exceljs");
const Casefile = db.casefiles;
const Op = db.Sequelize.Op;

// --- Compliance: Closed Files by Department (API) ---
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

// --- Compliance: Closed Files by Department (Excel Export) ---
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
    // Format: TPBI CLOSED FILES - OCTOBER 2025
    const monthObj = month ? new Date(`${month}-01`) : new Date();
    const monthName = monthObj
      .toLocaleString("default", { month: "long" })
      .toUpperCase();
    const year = monthObj.getFullYear();
    const titleText = `${deptName.toUpperCase()} CLOSED FILES - ${monthName} ${year}`;
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

    let rowIdx = 3;
    if (reportData.length === 0) {
      // No data: show a message row
      sheet.addRow(["No data found for the selected filters."]);
      sheet.mergeCells(`A${rowIdx}:G${rowIdx}`);
      const msgRow = sheet.getRow(rowIdx);
      msgRow.height = 24;
      msgRow.getCell(1).font = { name: "Tahoma", size: 13, italic: true };
      msgRow.getCell(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    } else {
      // --- Data rows ---
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
    }

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
      `attachment; filename=${deptName}_ClosedFiles_${monthObj.getFullYear()}${(
        monthObj.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    // Always send a valid response
    res.status(500).json({ message: err.message });
  }
};

// --- Compliance Ratio (By Insurer) - API ---
exports.getComplianceRatioInsurer = async (req, res) => {
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

    // Get all closed files for the month
    const files = await Casefile.findAll({
      where: {
        fileStatus: { [Op.in]: ["CLO", "CLOSED"] },
        dateClosed: { [Op.between]: [startDate, endDate] },
      },
      attributes: [
        "insurer",
        "refType",
        "subRefType",
        "dateOfAssign",
        "dateClosed",
        "id",
      ],
    });

    const result = {};
    files.forEach((file, idx) => {
      try {
        if (
          file.insurer === null ||
          file.insurer === undefined ||
          file.subRefType === null ||
          file.subRefType === undefined ||
          file.insurer === "" ||
          file.subRefType === ""
        ) {
          // skip files with missing insurer/subRefType
          return;
        }
        const insurerId = String(file.insurer);
        const subRefTypeId = String(file.subRefType);
        if (!result[insurerId]) {
          result[insurerId] = { complied: 0, notComplied: 0, total: 0 };
        }
        const tatKey = `${insurerId}-${subRefTypeId}`;
        const tatDays = tatMap.hasOwnProperty(tatKey) ? tatMap[tatKey] : null;
        let days = 0;
        if (file.dateOfAssign && file.dateClosed) {
          days = Math.abs(
            Math.floor(
              (new Date(file.dateClosed) - new Date(file.dateOfAssign)) /
                (1000 * 60 * 60 * 24)
            )
          );
        }
        if (
          tatDays === null ||
          typeof tatDays === "undefined" ||
          days <= tatDays
        ) {
          result[insurerId].complied += 1;
        } else {
          result[insurerId].notComplied += 1;
        }
        result[insurerId].total += 1;
      } catch (err) {
        // skip error
      }
    });

    const reportData = Object.entries(result)
      .map(([insurerId, counts]) => {
        const percent =
          counts.total > 0
            ? ((counts.complied / counts.total) * 100).toFixed(2)
            : "0.00";
        return {
          insurer: insurerMap[insurerId] || "Unknown",
          complied: counts.complied,
          notComplied: counts.notComplied,
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

// --- Compliance Ratio (By Insurer) - Excel Export ---
exports.exportComplianceRatioInsurer = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

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

    const files = await Casefile.findAll({
      where: {
        fileStatus: { [Op.in]: ["CLO", "CLOSED"] },
        dateClosed: { [Op.between]: [startDate, endDate] },
      },
      attributes: [
        "insurer",
        "refType",
        "subRefType",
        "dateOfAssign",
        "dateClosed",
        "id",
      ],
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
        result[insurerId] = { complied: 0, notComplied: 0, total: 0 };
      }
      const tatKey = `${insurerId}-${subRefTypeId}`;
      const tatDays = tatMap.hasOwnProperty(tatKey) ? tatMap[tatKey] : null;
      let days = 0;
      if (file.dateOfAssign && file.dateClosed) {
        days = Math.abs(
          Math.floor(
            (new Date(file.dateClosed) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        );
      }
      if (
        tatDays === null ||
        typeof tatDays === "undefined" ||
        days <= tatDays
      ) {
        result[insurerId].complied += 1;
      } else {
        result[insurerId].notComplied += 1;
      }
      result[insurerId].total += 1;
    });

    const reportData = Object.entries(result)
      .map(([insurerId, counts]) => {
        const percent =
          counts.total > 0
            ? ((counts.complied / counts.total) * 100).toFixed(2)
            : "0.00";
        return {
          insurer: insurerMap[insurerId] || "Unknown",
          complied: counts.complied,
          notComplied: counts.notComplied,
          total: counts.total,
          percent: percent,
        };
      })
      .sort((a, b) => a.insurer.localeCompare(b.insurer));

    // Excel generation
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Compliance Ratio (Insurer)");

    // --- Table Title ---
    // Format: COMPLIANCE SUMMARY OCTOBER 2025 - BASED ON CLOSED FILES - INSURER
    const monthObj = new Date(`${month}-01`);
    const monthName = monthObj
      .toLocaleString("default", { month: "long" })
      .toUpperCase();
    const year = monthObj.getFullYear();
    const titleText = `COMPLIANCE SUMMARY ${monthName} ${year} - BASED ON CLOSED FILES - INSURER`;
    sheet.addRow([titleText]);
    sheet.mergeCells("A1:E1");
    const titleRow = sheet.getRow(1);
    titleRow.height = 41.25;
    titleRow.getCell(1).font = { name: "Tahoma", size: 12, bold: true };
    titleRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    titleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF92D050" }, // #92D050
    };
    titleRow.getCell(1).value = titleText.toUpperCase();

    // --- Header row ---
    const headerValues = [
      "INSURER",
      "COMPLIED",
      "NOT COMPLIED",
      "TOTAL",
      "COMPLIED (%)",
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
    let totalComplied = 0,
      totalNotComplied = 0,
      totalFiles = 0;
    reportData.forEach((row) => {
      totalComplied += row.complied;
      totalNotComplied += row.notComplied;
      totalFiles += row.total;
      const values = [
        String(row.insurer).toUpperCase(),
        row.complied,
        row.notComplied,
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
      // Not Complied column (3rd col): red text
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
      totalFiles > 0 ? ((totalComplied / totalFiles) * 100).toFixed(2) : "0.00";
    sheet.addRow([
      "TOTAL",
      totalComplied,
      totalNotComplied,
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
      `attachment; filename=ComplianceRatio_Insurer_${month}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Compliance Ratio (By Branches) - API ---
exports.getComplianceRatioBranch = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    // Get all branches
    const branches = await db.branch.findAll({ attributes: ["id", "name"] });
    const branchMap = {};
    branches.forEach((b) => {
      branchMap[String(b.id)] = b.name;
    });

    // Get all TAT charts (for compliance days)
    const tatCharts = await db.tatchart.findAll();
    const tatMap = {};
    tatCharts.forEach((t) => {
      tatMap[`${String(t.insId)}-${String(t.subDeptId)}`] = t.tatMax;
    });

    // Get all closed files for the month
    const files = await db.casefiles.findAll({
      where: {
        fileStatus: { [db.Sequelize.Op.in]: ["CLO", "CLOSED"] },
        dateClosed: { [db.Sequelize.Op.between]: [startDate, endDate] },
      },
      attributes: [
        "branch",
        "insurer",
        "subRefType",
        "dateOfAssign",
        "dateClosed",
        "id",
      ],
    });

    const result = {};
    files.forEach((file) => {
      if (
        file.branch === null ||
        file.branch === undefined ||
        file.subRefType === null ||
        file.subRefType === undefined ||
        file.insurer === null ||
        file.insurer === undefined ||
        file.branch === "" ||
        file.subRefType === "" ||
        file.insurer === ""
      ) {
        return;
      }
      const branchId = String(file.branch);
      const subRefTypeId = String(file.subRefType);
      const insurerId = String(file.insurer);
      if (!result[branchId]) {
        result[branchId] = { complied: 0, notComplied: 0, total: 0 };
      }
      const tatKey = `${insurerId}-${subRefTypeId}`;
      const tatDays = tatMap.hasOwnProperty(tatKey) ? tatMap[tatKey] : null;
      let days = 0;
      if (file.dateOfAssign && file.dateClosed) {
        days = Math.abs(
          Math.floor(
            (new Date(file.dateClosed) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        );
      }
      if (
        tatDays === null ||
        typeof tatDays === "undefined" ||
        days <= tatDays
      ) {
        result[branchId].complied += 1;
      } else {
        result[branchId].notComplied += 1;
      }
      result[branchId].total += 1;
    });

    const reportData = Object.entries(result)
      .map(([branchId, counts]) => {
        const percent =
          counts.total > 0
            ? ((counts.complied / counts.total) * 100).toFixed(2)
            : "0.00";
        return {
          branch: branchMap[branchId] || "Unknown",
          complied: counts.complied,
          notComplied: counts.notComplied,
          total: counts.total,
          percent: percent,
        };
      })
      .sort((a, b) => a.branch.localeCompare(b.branch));

    res.json({ reportData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Compliance Ratio (By Branches) - Excel Export ---
exports.exportComplianceRatioBranch = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    // Reuse logic from getComplianceRatioBranch
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const branches = await db.branch.findAll({ attributes: ["id", "name"] });
    const branchMap = {};
    branches.forEach((b) => {
      branchMap[String(b.id)] = b.name;
    });

    const tatCharts = await db.tatchart.findAll();
    const tatMap = {};
    tatCharts.forEach((t) => {
      tatMap[`${String(t.insId)}-${String(t.subDeptId)}`] = t.tatMax;
    });

    const files = await db.casefiles.findAll({
      where: {
        fileStatus: { [db.Sequelize.Op.in]: ["CLO", "CLOSED"] },
        dateClosed: { [db.Sequelize.Op.between]: [startDate, endDate] },
      },
      attributes: [
        "branch",
        "insurer",
        "subRefType",
        "dateOfAssign",
        "dateClosed",
        "id",
      ],
    });

    const result = {};
    files.forEach((file) => {
      if (
        file.branch === null ||
        file.branch === undefined ||
        file.subRefType === null ||
        file.subRefType === undefined ||
        file.insurer === null ||
        file.insurer === undefined ||
        file.branch === "" ||
        file.subRefType === "" ||
        file.insurer === ""
      ) {
        return;
      }
      const branchId = String(file.branch);
      const subRefTypeId = String(file.subRefType);
      const insurerId = String(file.insurer);
      if (!result[branchId]) {
        result[branchId] = { complied: 0, notComplied: 0, total: 0 };
      }
      const tatKey = `${insurerId}-${subRefTypeId}`;
      const tatDays = tatMap.hasOwnProperty(tatKey) ? tatMap[tatKey] : null;
      let days = 0;
      if (file.dateOfAssign && file.dateClosed) {
        days = Math.abs(
          Math.floor(
            (new Date(file.dateClosed) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        );
      }
      if (
        tatDays === null ||
        typeof tatDays === "undefined" ||
        days <= tatDays
      ) {
        result[branchId].complied += 1;
      } else {
        result[branchId].notComplied += 1;
      }
      result[branchId].total += 1;
    });

    const reportData = Object.entries(result)
      .map(([branchId, counts]) => {
        const percent =
          counts.total > 0
            ? ((counts.complied / counts.total) * 100).toFixed(2)
            : "0.00";
        return {
          branch: branchMap[branchId] || "Unknown",
          complied: counts.complied,
          notComplied: counts.notComplied,
          total: counts.total,
          percent: percent,
        };
      })
      .sort((a, b) => a.branch.localeCompare(b.branch));

    // Excel generation
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Compliance Ratio (Branch)");

    // --- Table Title ---
    const monthObj = new Date(`${month}-01`);
    const monthName = monthObj
      .toLocaleString("default", { month: "long" })
      .toUpperCase();
    const year = monthObj.getFullYear();
    const titleText = `COMPLIANCE SUMMARY ${monthName} ${year} - BASED ON CLOSED FILES - BRANCH`;
    sheet.addRow([titleText]);
    sheet.mergeCells("A1:E1");
    const titleRow = sheet.getRow(1);
    titleRow.height = 41.25;
    titleRow.getCell(1).font = { name: "Tahoma", size: 12, bold: true };
    titleRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    titleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF92D050" },
    };
    titleRow.getCell(1).value = titleText.toUpperCase();

    // --- Header row ---
    const headerValues = [
      "BRANCH",
      "COMPLIED",
      "NOT COMPLIED",
      "TOTAL",
      "COMPLIED (%)",
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

    // --- Data rows ---
    let rowIdx = 3;
    let totalComplied = 0,
      totalNotComplied = 0,
      totalFiles = 0;
    reportData.forEach((row) => {
      totalComplied += row.complied;
      totalNotComplied += row.notComplied;
      totalFiles += row.total;
      const values = [
        String(row.branch).toUpperCase(),
        row.complied,
        row.notComplied,
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
      // Not Complied column (3rd col): red text
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
      totalFiles > 0 ? ((totalComplied / totalFiles) * 100).toFixed(2) : "0.00";
    sheet.addRow([
      "TOTAL",
      totalComplied,
      totalNotComplied,
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
      `attachment; filename=ComplianceRatio_Branch_${month}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
    titleRow.getCell(1).font = { name: "Tahoma", size: 12, bold: true };
    titleRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    titleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF92D050" },
    };
    titleRow.getCell(1).value = titleText.toUpperCase();

    // --- Header row ---
    const headerValues = [
      "INSURER",
      "OUTSTANDING (WITHIN TAT)",
      "OUTSTANDING (BREACHED TAT)",
      "TOTAL OUTSTANDING",
      "WITHIN TAT (%)",
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
      dataRow.getCell(1).font = { name: "Tahoma", size: 11, bold: false };
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
    sheet.addRow(["WITHIN TAT RATIO", "", "", "", overallPercent]);
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
    overallRow.getCell(1).value = "WITHIN TAT RATIO";
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

// Outstanding Assignment (By Branch) - API
exports.getOutstandingBranch = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const endDate = `${month}-31`;

    // Get all branches
    const branches = await db.branch.findAll({ attributes: ["id", "name"] });
    const branchMap = {};
    branches.forEach((b) => {
      branchMap[String(b.id)] = b.name;
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
      attributes: ["branch", "insurer", "subRefType", "dateOfAssign", "id"],
    });

    const result = {};
    files.forEach((file) => {
      if (
        file.branch === null ||
        file.branch === undefined ||
        file.subRefType === null ||
        file.subRefType === undefined ||
        file.insurer === null ||
        file.insurer === undefined ||
        file.branch === "" ||
        file.subRefType === "" ||
        file.insurer === ""
      ) {
        return;
      }
      const branchId = String(file.branch);
      const subRefTypeId = String(file.subRefType);
      const insurerId = String(file.insurer);
      if (!result[branchId]) {
        result[branchId] = { withinTat: 0, breachedTat: 0, total: 0 };
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
        result[branchId].withinTat += 1;
      } else {
        result[branchId].breachedTat += 1;
      }
      result[branchId].total += 1;
    });

    const reportData = Object.entries(result)
      .map(([branchId, counts]) => {
        const percent =
          counts.total > 0
            ? ((counts.withinTat / counts.total) * 100).toFixed(2)
            : "0.00";
        return {
          branch: branchMap[branchId] || "Unknown",
          withinTat: counts.withinTat,
          breachedTat: counts.breachedTat,
          total: counts.total,
          percent: percent,
        };
      })
      .sort((a, b) => a.branch.localeCompare(b.branch));

    res.json({ reportData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Outstanding Assignment (By Branch) - Excel Export
exports.exportOutstandingBranch = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const endDate = `${month}-31`;

    const branches = await db.branch.findAll({ attributes: ["id", "name"] });
    const branchMap = {};
    branches.forEach((b) => {
      branchMap[String(b.id)] = b.name;
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
      attributes: ["branch", "insurer", "subRefType", "dateOfAssign", "id"],
    });

    const result = {};
    files.forEach((file) => {
      if (
        file.branch === null ||
        file.branch === undefined ||
        file.subRefType === null ||
        file.subRefType === undefined ||
        file.insurer === null ||
        file.insurer === undefined ||
        file.branch === "" ||
        file.subRefType === "" ||
        file.insurer === ""
      ) {
        return;
      }
      const branchId = String(file.branch);
      const subRefTypeId = String(file.subRefType);
      const insurerId = String(file.insurer);
      if (!result[branchId]) {
        result[branchId] = { withinTat: 0, breachedTat: 0, total: 0 };
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
        result[branchId].withinTat += 1;
      } else {
        result[branchId].breachedTat += 1;
      }
      result[branchId].total += 1;
    });

    const reportData = Object.entries(result)
      .map(([branchId, counts]) => {
        const percent =
          counts.total > 0
            ? ((counts.withinTat / counts.total) * 100).toFixed(2)
            : "0.00";
        return {
          branch: branchMap[branchId] || "Unknown",
          withinTat: counts.withinTat,
          breachedTat: counts.breachedTat,
          total: counts.total,
          percent: percent,
        };
      })
      .sort((a, b) => a.branch.localeCompare(b.branch));

    // Excel generation
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Outstanding (Branch)");

    // --- Table Title ---
    const monthObj = new Date(`${month}-31`);
    const monthName = monthObj
      .toLocaleString("default", { month: "long" })
      .toUpperCase();
    const year = monthObj.getFullYear();
    const titleText = `OUTSTANDING ASSIGNMENT SUMMARY ${monthName} ${year} - BY BRANCH`;
    sheet.addRow([titleText]);
    sheet.mergeCells("A1:E1");
    const titleRow = sheet.getRow(1);
    titleRow.height = 41.25;
    titleRow.getCell(1).font = { name: "Tahoma", size: 12, bold: true };
    titleRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    titleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF92D050" },
    };
    titleRow.getCell(1).value = titleText.toUpperCase();

    // --- Header row ---
    const headerValues = [
      "BRANCH",
      "OUTSTANDING (WITHIN TAT)",
      "OUTSTANDING (BREACHED TAT)",
      "TOTAL OUTSTANDING",
      "WITHIN TAT (%)",
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
        String(row.branch).toUpperCase(),
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
      // Not Complied column (3rd col): red text
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
    sheet.addRow(["WITHIN TAT RATIO", "", "", "", overallPercent]);
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
    overallRow.getCell(1).value = "WITHIN TAT RATIO";
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
      `attachment; filename=Outstanding_Branch_${month}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Outstanding Assignment by Days (Insurer) - API
exports.getOutstandingDaysInsurer = async (req, res) => {
  try {
    const { month, deptId } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const endDate = `${month}-31`;

    // Get all insurers
    const insurers = await db.inss.findAll({ attributes: ["id", "name"] });
    const insurerMap = {};
    insurers.forEach((ins) => {
      insurerMap[String(ins.id)] = ins.name;
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
      attributes: ["insurer", "dateOfAssign", "id"],
    });

    const buckets = {};
    files.forEach((file) => {
      const insurerName = insurerMap[file.insurer] || "Unknown";
      if (!buckets[insurerName]) {
        buckets[insurerName] = {
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
      if (days < 30) buckets[insurerName].below30 += 1;
      if (days >= 30 && days < 45) buckets[insurerName].above30 += 1;
      if (days >= 45 && days < 60) buckets[insurerName].above45 += 1;
      if (days >= 60 && days < 90) buckets[insurerName].above60 += 1;
      if (days >= 90) buckets[insurerName].above90 += 1;
      buckets[insurerName].total += 1;
    });

    const reportData = Object.entries(buckets).map(([insurer, counts]) => ({
      insurer,
      ...counts,
    }));

    // Sort insurers alphabetically
    reportData.sort((a, b) => a.insurer.localeCompare(b.insurer));

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

    const insurers = await db.inss.findAll({ attributes: ["id", "name"] });
    const insurerMap = {};
    insurers.forEach((ins) => {
      insurerMap[String(ins.id)] = ins.name;
    });

    const where = {
      fileStatus: { [db.Sequelize.Op.notIn]: ["CLO", "CLOSED", "CANC"] },
      dateOfAssign: { [db.Sequelize.Op.lte]: endDate },
      ...(deptId && deptId !== "all" && { refType: deptId }),
    };

    const files = await db.casefiles.findAll({
      where,
      attributes: ["insurer", "dateOfAssign", "id"],
    });

    const buckets = {};
    files.forEach((file) => {
      const insurerName = insurerMap[file.insurer] || "Unknown";
      if (!buckets[insurerName]) {
        buckets[insurerName] = {
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
      if (days < 30) buckets[insurerName].below30 += 1;
      if (days >= 30 && days < 45) buckets[insurerName].above30 += 1;
      if (days >= 45 && days < 60) buckets[insurerName].above45 += 1;
      if (days >= 60 && days < 90) buckets[insurerName].above60 += 1;
      if (days >= 90) buckets[insurerName].above90 += 1;
      buckets[insurerName].total += 1;
    });

    const reportData = Object.entries(buckets).map(([insurer, counts]) => ({
      insurer,
      ...counts,
    }));

    // Sort insurers alphabetically
    reportData.sort((a, b) => a.insurer.localeCompare(b.insurer));

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
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Outstanding By Days (Insurer)");

    // --- Title row ---
    const monthObj = new Date(`${month}-31`);
    const monthName = monthObj
      .toLocaleString("default", { month: "long" })
      .toUpperCase();
    const year = monthObj.getFullYear();
    const titleText = `${deptName.toUpperCase()} OUTSTANDING BY DAYS - INSURER - AS OF ${monthObj.getDate()} ${monthName} ${year}`;
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
    headerRow.height = 22;
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
        row.insurer.toUpperCase(),
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
    sheet.addRow(["", "", "", "", "NEW FILES", "", ""]);
    const newFilesRow = sheet.getRow(rowIdx + 1);
    newFilesRow.height = 18;
    newFilesRow.getCell(5).font = { name: "Calibri", size: 11, bold: true };
    newFilesRow.getCell(5).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // --- "GRAND TOTAL" row ---
    sheet.addRow(["", "", "", "", "GRAND TOTAL", "", totals.total]);
    const grandTotalRow = sheet.getRow(rowIdx + 2);
    grandTotalRow.height = 18;
    grandTotalRow.getCell(5).font = { name: "Calibri", size: 11, bold: true };
    grandTotalRow.getCell(5).alignment = {
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
      `attachment; filename=OutstandingDays_Insurer_${month}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
