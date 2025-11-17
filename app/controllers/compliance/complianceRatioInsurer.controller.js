const db = require("../../models");
const ExcelJS = require("exceljs");
const Casefile = db.casefiles;
const Op = db.Sequelize.Op;

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
