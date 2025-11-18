const db = require("../../models");
const ExcelJS = require("exceljs");
const Casefile = db.casefiles;
const Op = db.Sequelize.Op;

// --- Compliance Ratio (By Insurer, Filtered by Dept & Classification) - API ---
exports.getComplianceRatioInsurerDept = async (req, res) => {
  try {
    const { month, deptId, classificationId } = req.query;
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

    res.json({ reportData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Compliance Ratio (By Insurer, Filtered by Dept & Classification) - Excel Export ---
exports.exportComplianceRatioInsurerDept = async (req, res) => {
  try {
    const { month, deptId, classificationId } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const startDate = `${month}-01`;
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

    // Get all TAT charts (for compliance days)
    const tatCharts = await db.tatchart.findAll();
    const tatMap = {};
    tatCharts.forEach((t) => {
      tatMap[`${String(t.insId)}-${String(t.subDeptId)}`] = t.tatMax;
    });

    // Prepare Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Compliance Ratio (Insurer/Dept)");
    const totalCols = 5;
    const lastColLetter = String.fromCharCode(64 + totalCols); // E

    const monthObj = new Date(`${month}-01`);
    const monthName = monthObj
      .toLocaleString("default", { month: "long" })
      .toUpperCase();
    const year = monthObj.getFullYear();

    // Split header into two rows
    const titleMain = `COMPLIANCE SUMMARY ${monthName} ${year}`;
    const titleDetails = `Assignment Ratio by Insurer, Department, Classification`;

    sheet.addRow([titleMain]);
    sheet.mergeCells(`A1:${lastColLetter}1`);
    const titleRow = sheet.getRow(1);
    titleRow.height = 28;
    titleRow.getCell(1).font = { name: "Tahoma", size: 13, bold: true };
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

    sheet.addRow([titleDetails]);
    sheet.mergeCells(`A2:${lastColLetter}2`);
    const detailsRow = sheet.getRow(2);
    detailsRow.height = 22;
    detailsRow.getCell(1).font = { name: "Tahoma", size: 11, bold: false };
    detailsRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    detailsRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEDEDED" },
    };

    // --- Header row ---
    const headerValues = [
      "INSURER",
      "COMPLIED",
      "NOT COMPLIED",
      "TOTAL",
      "COMPLIED (%)",
    ];
    sheet.addRow(headerValues);
    const headerRow = sheet.getRow(3);
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: "Tahoma",
        size: 11,
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

    let rowIdx = 4;

    // --- Data logic ---
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

    // Filter insurers to those present in files
    let insurerIds = Array.from(new Set(files.map((f) => String(f.insurer))));

    // Sort insurerIds by code (or name if code missing)
    insurerIds = insurerIds.sort((a, b) => {
      const aLabel = (
        insurerMap[a]?.code ||
        insurerMap[a]?.name ||
        a
      ).toUpperCase();
      const bLabel = (
        insurerMap[b]?.code ||
        insurerMap[b]?.name ||
        b
      ).toUpperCase();
      return aLabel.localeCompare(bLabel);
    });

    for (const insurerId of insurerIds) {
      const insInfo = insurerMap[insurerId] || {
        name: "Unknown",
        code: insurerId,
      };

      // 1. Summary row for insurer (all dept/class)
      const filesIns = files.filter((f) => String(f.insurer) === insurerId);
      let complied = 0,
        notComplied = 0,
        total = 0;
      filesIns.forEach((file) => {
        const tatKey = `${insurerId}-${String(file.subRefType)}`;
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
          complied += 1;
        } else {
          notComplied += 1;
        }
        total += 1;
      });
      const percent =
        total > 0 ? ((complied / total) * 100).toFixed(2) : "0.00";
      sheet.addRow([
        (insInfo.code || insInfo.name).toUpperCase(),
        complied,
        notComplied,
        total,
        percent,
      ]);
      const dataRow = sheet.getRow(rowIdx++);
      dataRow.height = 18;
      dataRow.getCell(1).font = { name: "Tahoma", size: 11, bold: true };
      dataRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" }; // left align insurer
      for (let col = 2; col <= totalCols; col++) {
        dataRow.getCell(col).font = { name: "Tahoma", size: 11, bold: true };
        dataRow.getCell(col).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      }
      dataRow.getCell(3).font = {
        name: "Tahoma",
        size: 11,
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

      // 2. For each department/classification
      let deptFilterIds = [];
      if (!deptId || deptId === "all") {
        deptFilterIds = Array.from(
          new Set(filesIns.map((f) => String(f.refType)))
        );
      } else {
        deptFilterIds = [String(deptId)];
      }

      for (const dId of deptFilterIds) {
        const deptFiles = filesIns.filter((f) => String(f.refType) === dId);
        let classFilterIds = [];
        if (!classificationId || classificationId === "all") {
          classFilterIds = Array.from(
            new Set(deptFiles.map((f) => String(f.subRefType)))
          );
        } else {
          classFilterIds = [String(classificationId)];
        }

        for (const cId of classFilterIds) {
          const classFiles = deptFiles.filter(
            (f) => String(f.subRefType) === cId
          );
          let compliedC = 0,
            notCompliedC = 0,
            totalC = 0;
          classFiles.forEach((file) => {
            const tatKey = `${insurerId}-${String(file.subRefType)}`;
            const tatDays = tatMap.hasOwnProperty(tatKey)
              ? tatMap[tatKey]
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
              tatDays === null ||
              typeof tatDays === "undefined" ||
              days <= tatDays
            ) {
              compliedC += 1;
            } else {
              notCompliedC += 1;
            }
            totalC += 1;
          });
          const percentC =
            totalC > 0 ? ((compliedC / totalC) * 100).toFixed(2) : "0.00";
          // Label: Allianz (TPBI/BI)
          const label = `${(insInfo.code || insInfo.name).toUpperCase()} (${
            deptMap[dId] || dId
          }/${subDeptMap[cId] || cId})`;
          sheet.addRow([label, compliedC, notCompliedC, totalC, percentC]);
          const classRow = sheet.getRow(rowIdx++);
          classRow.height = 18;
          classRow.getCell(1).font = { name: "Tahoma", size: 11, bold: false };
          classRow.getCell(1).alignment = {
            vertical: "middle",
            horizontal: "left",
          }; // left align insurer
          for (let col = 2; col <= totalCols; col++) {
            classRow.getCell(col).font = {
              name: "Tahoma",
              size: 11,
              bold: true,
            };
            classRow.getCell(col).alignment = {
              vertical: "middle",
              horizontal: "center",
            };
          }
          classRow.getCell(3).font = {
            name: "Tahoma",
            size: 11,
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
          });
        }
      }
    }

    // --- Set column widths ---
    for (let i = 1; i <= totalCols; i++) {
      sheet.getColumn(i).width = i === 1 ? 28 : 18;
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ComplianceRatio_InsurerDept_${month}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
