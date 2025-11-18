const db = require("../../models");
const ExcelJS = require("exceljs");
const Casefile = db.casefiles;
const Op = db.Sequelize.Op;

// --- Compliance Ratio (By Branch, Filtered by Dept & Classification) - API ---
exports.getComplianceRatioBranch = async (req, res) => {
  try {
    const { month, deptId, classificationId } = req.query;
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
    // Build TAT map: subDeptId -> tatMax
    const tatMap = {};
    tatCharts.forEach((t) => {
      tatMap[String(t.subDeptId)] = t.tatMax;
    });

    // Build where clause
    const where = {
      fileStatus: { [Op.in]: ["CLO", "CLOSED"] },
      dateClosed: { [Op.between]: [startDate, endDate] },
      ...(deptId && deptId !== "all" && { refType: deptId }),
      ...(classificationId &&
        classificationId !== "all" && { subRefType: classificationId }),
    };

    // Get all closed files for the month, filtered
    const files = await Casefile.findAll({
      where,
      attributes: [
        "branch",
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
        file.branch === null ||
        file.branch === undefined ||
        file.subRefType === null ||
        file.subRefType === undefined ||
        file.branch === "" ||
        file.subRefType === ""
      ) {
        return;
      }
      const branchId = String(file.branch);
      const refTypeId = String(file.refType);
      const subRefTypeId = String(file.subRefType);
      if (!result[branchId]) {
        result[branchId] = { complied: 0, notComplied: 0, total: 0 };
      }
      // Use department and file classification for TAT
      const tatKey = `${refTypeId}-${subRefTypeId}`;
      const tatDays = tatMap.hasOwnProperty(subRefTypeId)
        ? tatMap[subRefTypeId]
        : null;
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
        tatDays !== null &&
        typeof tatDays !== "undefined" &&
        days > tatDays
      ) {
        result[branchId].notComplied += 1;
      } else {
        result[branchId].complied += 1;
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

function sanitizeExcelValue(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val);
  // Remove non-printable/control characters
  return String(val).replace(/[\x00-\x1F\x7F-\x9F]/g, "");
}

// --- Compliance Ratio (By Branch, Filtered by Dept & Classification) - Excel Export ---
exports.exportComplianceRatioBranch = async (req, res) => {
  try {
    const { month, deptId, classificationId } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    // Get all branches (with branchCode)
    const branches = await db.branch.findAll({
      attributes: ["id", "name", "brCode"],
    });
    const branchMap = {};
    branches.forEach((b) => {
      branchMap[String(b.id)] = {
        name: b.name,
        code: b.brCode || b.name,
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
    // Build TAT map: subDeptId -> tatMax
    const tatMap = {};
    tatCharts.forEach((t) => {
      tatMap[String(t.subDeptId)] = t.tatMax;
    });

    // Build subDeptId -> deptId (refType) map from tatchart
    const subDeptToDeptMap = {};
    tatCharts.forEach((t) => {
      subDeptToDeptMap[String(t.subDeptId)] = String(t.refType);
    });

    // Get all closed files for the month
    const files = await db.casefiles.findAll({
      where: {
        fileStatus: { [db.Sequelize.Op.in]: ["CLO", "CLOSED"] },
        dateClosed: { [db.Sequelize.Op.between]: [startDate, endDate] },
        ...(deptId && deptId !== "all" && { refType: deptId }),
        ...(classificationId &&
          classificationId !== "all" && { subRefType: classificationId }),
      },
      attributes: [
        "branch",
        "refType",
        "subRefType",
        "dateOfAssign",
        "dateClosed",
        "id",
      ],
    });

    // Filter branches to those present in files
    let branchIds = Array.from(new Set(files.map((f) => String(f.branch))));
    branchIds = branchIds.sort((a, b) => {
      const aLabel = (
        branchMap[a]?.code ||
        branchMap[a]?.name ||
        a
      ).toUpperCase();
      const bLabel = (
        branchMap[b]?.code ||
        branchMap[b]?.name ||
        b
      ).toUpperCase();
      return aLabel.localeCompare(bLabel);
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    const totalCols = 5;
    const lastColLetter = String.fromCharCode(64 + totalCols); // E

    // Add merged title row
    const titleText = "COMPLIANCE RATIO BY BRANCH - BASED ON CLOSED FILES";
    sheet.addRow([titleText, "", "", "", ""]);
    sheet.mergeCells(`A1:${lastColLetter}1`);
    const titleRow = sheet.getRow(1);
    titleRow.height = 32;
    titleRow.getCell(1).font = { name: "Tahoma", size: 14, bold: true };
    titleRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    titleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF92D050" },
    };

    // Add selected attributes row
    let deptLabel = "All Departments";
    let classLabel = "All Classifications";
    if (deptId && deptId !== "all" && deptMap[deptId])
      deptLabel = deptMap[deptId];
    if (
      classificationId &&
      classificationId !== "all" &&
      subDeptMap[classificationId]
    )
      classLabel = subDeptMap[classificationId];
    const attrText = `Assignment Ratio by Branch, ${deptLabel}, ${classLabel}`;
    sheet.addRow([attrText, "", "", "", ""]);
    sheet.mergeCells(`A2:${lastColLetter}2`);
    const attrRow = sheet.getRow(2);
    attrRow.height = 22;
    attrRow.getCell(1).font = { name: "Tahoma", size: 12, bold: false };
    attrRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    attrRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEDEDED" },
    };

    // Add header row with minimal formatting
    const headerRow = sheet.addRow([
      "BRANCH",
      "COMPLIED",
      "NOT COMPLIED",
      "TOTAL",
      "COMPLIED (%)",
    ]);
    headerRow.height = 32;
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

    // Add summary section for total closed files for selected month (unfiltered)
    let branchClosedStats = {};
    if (month) {
      // Get all closed files for the selected month (ignore deptId/classificationId filters)
      const startMonth = `${month}-01`;
      const endMonth = `${month}-31`;
      const allMonthFiles = await db.casefiles.findAll({
        where: {
          fileStatus: { [db.Sequelize.Op.in]: ["CLO", "CLOSED"] },
          dateClosed: {
            [db.Sequelize.Op.between]: [startMonth, endMonth],
          },
        },
        attributes: ["branch"],
      });

      allMonthFiles.forEach((file) => {
        const branchId = String(file.branch);
        if (!branchClosedStats[branchId]) {
          branchClosedStats[branchId] = {
            total: 0,
            complied: 0,
            notComplied: 0,
          };
        }
        branchClosedStats[branchId].total += 1;
      });

      const allMonthFilesFull = await db.casefiles.findAll({
        where: {
          fileStatus: { [db.Sequelize.Op.in]: ["CLO", "CLOSED"] },
          dateClosed: {
            [db.Sequelize.Op.between]: [startMonth, endMonth],
          },
        },
        attributes: ["branch", "subRefType", "dateOfAssign", "dateClosed"],
      });

      allMonthFilesFull.forEach((file) => {
        const branchId = String(file.branch);
        const subRefTypeId = String(file.subRefType);
        const tatDays = tatMap.hasOwnProperty(subRefTypeId)
          ? tatMap[subRefTypeId]
          : null;
        let days = 0;
        if (file.dateOfAssign && file.dateClosed) {
          days = Math.abs(
            Math.floor(
              (new Date(file.dateClosed) - new Date(file.dateOfAssign)) /
                (1000 * 60 * 60 * 24)
            )
          );
        }
        if (!branchClosedStats[branchId]) {
          branchClosedStats[branchId] = {
            total: 0,
            complied: 0,
            notComplied: 0,
          };
        }
        if (
          tatDays !== null &&
          typeof tatDays !== "undefined" &&
          days > tatDays
        ) {
          branchClosedStats[branchId].notComplied += 1;
        } else {
          branchClosedStats[branchId].complied += 1;
        }
      });

      // Remove the TOTAL row for all branches (do not add this block):
      // const totalStats = Object.values(branchClosedStats).reduce(
      //   (acc, stats) => {
      //     acc.complied += stats.complied;
      //     acc.notComplied += stats.notComplied;
      //     acc.total += stats.total;
      //     return acc;
      //   },
      //   { complied: 0, notComplied: 0, total: 0 }
      // );
      // const totalPercent =
      //   totalStats.total > 0
      //     ? ((totalStats.complied / totalStats.total) * 100).toFixed(2)
      //     : "0.00";
      // sheet.addRow([
      //   "TOTAL",
      //   totalStats.complied,
      //   totalStats.notComplied,
      //   totalStats.total,
      //   totalPercent,
      // ]);
      // const totalRow = sheet.getRow(sheet.lastRow.number);
      // totalRow.height = 20;
      // totalRow.getCell(1).font = { name: "Tahoma", size: 13, bold: true };
      // totalRow.getCell(1).alignment = {
      //   vertical: "middle",
      //   horizontal: "left",
      // };
      // for (let col = 2; col <= totalCols; col++) {
      //   totalRow.getCell(col).font = { name: "Tahoma", size: 13, bold: true };
      //   totalRow.getCell(col).alignment = {
      //     vertical: "middle",
      //     horizontal: "center",
      //   };
      // }
      // totalRow.getCell(3).font = {
      //   name: "Tahoma",
      //   size: 13,
      //   bold: true,
      //   color: { argb: "FFFF0000" },
      // };
      // totalRow.eachCell((cell, colNumber) => {
      //   cell.border = {
      //     top: { style: "medium" },
      //     left: { style: "thin" },
      //     bottom: { style: "medium" },
      //     right: { style: "thin" },
      //   };
      //   cell.fill = {
      //     type: "pattern",
      //     pattern: "solid",
      //     fgColor: { argb: "FFEDEDED" },
      //   };
      // });
    }

    for (const branchId of branchIds) {
      const brInfo = branchMap[branchId] || {
        name: "Unknown",
        code: branchId,
      };

      // Use unfiltered compliance stats for summary row
      const stats = branchClosedStats[branchId] || {
        complied: 0,
        notComplied: 0,
        total: 0,
      };
      const percent =
        stats.total > 0
          ? ((stats.complied / stats.total) * 100).toFixed(2)
          : "0.00";

      // Show branch name only (no department/classification in summary row)
      const dataRow = sheet.addRow([
        String(brInfo.code || brInfo.name).toUpperCase(),
        stats.complied,
        stats.notComplied,
        stats.total,
        percent,
      ]);
      dataRow.height = 18;
      dataRow.getCell(1).font = { name: "Tahoma", size: 12, bold: true };
      dataRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
      for (let col = 2; col <= totalCols; col++) {
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
      dataRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      rowIdx++;

      // Define filesBr for detail rows (filtered by current filters)
      const filesBr = files.filter((f) => String(f.branch) === branchId);

      // Detail rows logic
      // Fix for all detail row blocks:
      // Example for "all departments and all classifications":
      for (const deptKey of Object.keys(deptMap)) {
        const deptFiles = filesBr.filter((f) => String(f.refType) === deptKey);
        if (deptFiles.length === 0) continue;
        for (const classKey of Object.keys(subDeptMap)) {
          const comboFiles = deptFiles.filter(
            (f) => String(f.subRefType) === classKey
          );
          if (comboFiles.length === 0) continue;
          let compliedC = 0,
            notCompliedC = 0,
            totalC = 0;
          // Get department name from the first file's refType
          let deptNameForClass = "Unknown";
          if (comboFiles.length > 0) {
            const deptIdFromFile = String(comboFiles[0].refType);
            deptNameForClass = deptMap[deptIdFromFile] || "Unknown";
          }
          const className = subDeptMap[classKey] || classKey;
          comboFiles.forEach((file) => {
            const subRefTypeId = String(file.subRefType);
            const tatDays = tatMap.hasOwnProperty(subRefTypeId)
              ? tatMap[subRefTypeId]
              : null;
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
              tatDays !== null &&
              typeof tatDays !== "undefined" &&
              days > tatDays
            ) {
              notCompliedC += 1;
            } else {
              compliedC += 1;
            }
            totalC += 1;
          });
          const percentValue =
            totalC > 0 ? ((compliedC / totalC) * 100).toFixed(2) : "0.00";
          const classRow = sheet.addRow([
            `${String(
              brInfo.code || brInfo.name
            ).toUpperCase()} (${deptNameForClass} - ${className})`,
            compliedC,
            notCompliedC,
            totalC,
            percentValue,
          ]);
          classRow.height = 18;
          classRow.getCell(1).font = { name: "Tahoma", size: 12, bold: false };
          classRow.getCell(1).alignment = {
            vertical: "middle",
            horizontal: "left",
          };
          for (let col = 2; col <= totalCols; col++) {
            classRow.getCell(col).font = {
              name: "Tahoma",
              size: 12,
              bold: true,
            };
            classRow.getCell(col).alignment = {
              vertical: "middle",
              horizontal: "center",
            };
          }
          classRow.getCell(3).font = {
            name: "Tahoma",
            size: 12,
            bold: true,
            color: { argb: "FFFF0000" },
          };
          classRow.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
            // Highlight row if compliance < 80%
            if (parseFloat(percentValue) < 80) {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFEEEE" }, // light red
              };
            }
          });
          rowIdx++;
        }
      }
      // Repeat this logic for all other detail row blocks:
      // - deptId !== "all" && classificationId === "all"
      // - deptId !== "all" && classificationId !== "all"
      // - deptId === "all" && classificationId !== "all"
      // - specific department/classification
      // Always: if days > tatDays → notComplied, else complied
    }

    // After all branch rows and detail rows
    // Calculate totals
    let totalComplied = 0,
      totalNotComplied = 0,
      totalFiles = 0;
    for (const branchId of branchIds) {
      // Use the same logic as summary row for each branch
      const allClosedFilesForBranch = files.filter(
        (f) => String(f.branch) === branchId
      );

      allClosedFilesForBranch.forEach((file) => {
        const refTypeId = String(file.refType);
        const subRefTypeId = String(file.subRefType);
        const tatKey = `${refTypeId}-${subRefTypeId}`;
        const tatDays = tatMap.hasOwnProperty(subRefTypeId)
          ? tatMap[subRefTypeId]
          : null;
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
          tatDays !== null &&
          typeof tatDays !== "undefined" &&
          days > tatDays
        ) {
          totalNotComplied += 1;
        } else {
          totalComplied += 1;
        }
        totalFiles += 1;
      });
    }
    const totalPercent =
      totalFiles > 0 ? ((totalComplied / totalFiles) * 100).toFixed(2) : "0.00";

    // Add total row
    const totalRow = sheet.addRow([
      "TOTAL",
      totalComplied,
      totalNotComplied,
      totalFiles,
      totalPercent,
    ]);
    totalRow.height = 20;
    totalRow.getCell(1).font = { name: "Tahoma", size: 13, bold: true };
    totalRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    for (let col = 2; col <= totalCols; col++) {
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
      "attachment; filename=ComplianceRatio_BranchDept_OK.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
