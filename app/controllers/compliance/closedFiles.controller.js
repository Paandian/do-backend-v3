const db = require("../../models");
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

    // Get file classification name if specified and not "all"/null
    let className = "";
    if (
      classificationId &&
      classificationId !== "all" &&
      classificationId !== "null"
    ) {
      const subDept = await db.subDept.findByPk(classificationId);
      if (subDept) className = subDept.subCode;
    }
    if (
      !className ||
      classificationId === "all" ||
      classificationId === "null"
    ) {
      className = "All Classifications";
    }

    // Format: TPBI CLOSED FILES - OCTOBER 2025 (All Classifications)
    const monthObj = month ? new Date(`${month}-01`) : new Date();
    const monthName = monthObj
      .toLocaleString("default", { month: "long" })
      .toUpperCase();
    const year = monthObj.getFullYear();
    const titleText = `${deptName.toUpperCase()} CLOSED FILES - ${monthName} ${year} (${className})`;
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
    headerRow.height = 42;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: "Tahoma",
        size: 12,
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
          cell.alignment = {
            vertical: "middle",
            horizontal: colNumber === 1 ? "left" : "center",
          }; // <-- left align branch
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
        cell.alignment = {
          vertical: "middle",
          horizontal: colNumber === 1 ? "left" : "center",
        }; // <-- left align branch
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
