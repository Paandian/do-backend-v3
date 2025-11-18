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

function sanitizeExcelValue(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val);
  // Remove non-printable/control characters
  return String(val).replace(/[\x00-\x1F\x7F-\x9F]/g, "");
}

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

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    const totalCols = 5;
    const lastColLetter = String.fromCharCode(64 + totalCols); // E

    // Add merged title row
    const titleText = "COMPLIANCE RATIO BY INSURER - BASED ON CLOSED FILES";
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
    const attrText = `Assignment Ratio by Insurer, ${deptLabel}, ${classLabel}`;
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
      "INSURER",
      "COMPLIED",
      "NOT COMPLIED",
      "TOTAL",
      "COMPLIED (%)",
    ]);
    headerRow.height = 35; // <-- set row height to 32
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

    for (const insurerId of insurerIds) {
      const insInfo = insurerMap[insurerId] || {
        name: "Unknown",
        code: insurerId,
      };

      // Summary row: all closed files for this insurer in the selected month
      const allClosedFilesForInsurer = await db.casefiles.findAll({
        where: {
          insurer: insurerId,
          fileStatus: { [db.Sequelize.Op.in]: ["CLO", "CLOSED"] },
          dateClosed: { [db.Sequelize.Op.between]: [startDate, endDate] },
        },
        attributes: ["subRefType", "dateOfAssign", "dateClosed"],
      });

      let complied = 0,
        notComplied = 0,
        total = 0;
      allClosedFilesForInsurer.forEach((file) => {
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

      const dataRow = sheet.addRow([
        String(insInfo.code || insInfo.name).toUpperCase(),
        complied,
        notComplied,
        total,
        total > 0 ? ((complied / total) * 100).toFixed(2) : "0.00",
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

      // Define filesIns for detail rows (filtered by current filters)
      const filesIns = files.filter((f) => String(f.insurer) === insurerId);

      // Detail rows logic
      if (deptId !== "all" && classificationId === "all") {
        // Loop through all file classifications for the selected department and insurer
        for (const classKey of Object.keys(subDeptMap)) {
          const comboFiles = filesIns.filter(
            (f) =>
              String(f.refType) === deptId && String(f.subRefType) === classKey
          );
          if (comboFiles.length === 0) continue;
          let compliedC = 0,
            notCompliedC = 0,
            totalC = 0;
          comboFiles.forEach((file) => {
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
          const className = subDeptMap[classKey] || classKey;
          const deptName = deptMap[deptId] || deptId;
          const percentValue =
            totalC > 0 ? ((compliedC / totalC) * 100).toFixed(2) : "0.00";
          const classRow = sheet.addRow([
            `${String(
              insInfo.code || insInfo.name
            ).toUpperCase()} (${deptName} - ${className})`,
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
      } else if (deptId !== "all" && classificationId !== "all") {
        // Show a row for each file classification for the selected department and insurer
        for (const classKey of Object.keys(subDeptMap)) {
          const comboFiles = filesIns.filter(
            (f) =>
              String(f.refType) === deptId && String(f.subRefType) === classKey
          );
          if (comboFiles.length === 0) continue;
          let compliedC = 0,
            notCompliedC = 0,
            totalC = 0;
          comboFiles.forEach((file) => {
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
          const className = subDeptMap[classKey] || classKey;
          const deptName = deptMap[deptId] || deptId;
          const percentValue =
            totalC > 0 ? ((compliedC / totalC) * 100).toFixed(2) : "0.00";
          const classRow = sheet.addRow([
            `${String(
              insInfo.code || insInfo.name
            ).toUpperCase()} (${deptName} - ${className})`,
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
      } else if (deptId === "all" && classificationId === "all") {
        // Loop through all departments, then all classifications for each department
        for (const deptKey of Object.keys(deptMap)) {
          const deptFiles = filesIns.filter(
            (f) => String(f.refType) === deptKey
          );
          if (deptFiles.length === 0) continue;
          for (const classKey of Object.keys(subDeptMap)) {
            const comboFiles = deptFiles.filter(
              (f) => String(f.subRefType) === classKey
            );
            if (comboFiles.length === 0) continue;
            let compliedC = 0,
              notCompliedC = 0,
              totalC = 0;
            comboFiles.forEach((file) => {
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
            const className = subDeptMap[classKey] || classKey;
            const deptName = deptMap[deptKey] || deptKey;
            const percentValue =
              totalC > 0 ? ((compliedC / totalC) * 100).toFixed(2) : "0.00";
            const classRow = sheet.addRow([
              `${String(
                insInfo.code || insInfo.name
              ).toUpperCase()} (${deptName} - ${className})`,
              compliedC,
              notCompliedC,
              totalC,
              percentValue,
            ]);
            classRow.height = 18;
            classRow.getCell(1).font = {
              name: "Tahoma",
              size: 12,
              bold: false,
            };
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
      } else if (deptId === "all" && classificationId !== "all") {
        // Loop through all departments for the selected classification
        for (const deptKey of Object.keys(deptMap)) {
          const comboFiles = filesIns.filter(
            (f) =>
              String(f.refType) === deptKey &&
              String(f.subRefType) === classificationId
          );
          if (comboFiles.length === 0) continue;
          let compliedC = 0,
            notCompliedC = 0,
            totalC = 0;
          comboFiles.forEach((file) => {
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
          const className = subDeptMap[classificationId] || classificationId;
          const deptName = deptMap[deptKey] || deptKey;
          const percentValue =
            totalC > 0 ? ((compliedC / totalC) * 100).toFixed(2) : "0.00";
          const classRow = sheet.addRow([
            `${String(
              insInfo.code || insInfo.name
            ).toUpperCase()} (${deptName} - ${className})`,
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
      } else {
        // Specific department and classification
        const comboFiles = filesIns.filter(
          (f) =>
            (deptId === "all" || String(f.refType) === deptId) &&
            (classificationId === "all" ||
              String(f.subRefType) === classificationId)
        );
        if (comboFiles.length > 0) {
          let compliedC = 0,
            notCompliedC = 0,
            totalC = 0;
          comboFiles.forEach((file) => {
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
          const className =
            classificationId !== "all"
              ? subDeptMap[classificationId] || classificationId
              : "ALL CLASSIFICATION";
          const deptName =
            deptId !== "all" ? deptMap[deptId] || deptId : "ALL DEPARTMENT";
          const percentValue =
            totalC > 0 ? ((compliedC / totalC) * 100).toFixed(2) : "0.00";
          const classRow = sheet.addRow([
            `${String(
              insInfo.code || insInfo.name
            ).toUpperCase()} (${deptName} - ${className})`,
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
    }

    // After all insurer rows and detail rows
    // Calculate totals for filtered files (not unfiltered)
    let totalComplied = 0,
      totalNotComplied = 0,
      totalFiles = 0;
    files.forEach((file) => {
      const insurerId = String(file.insurer);
      const subRefTypeId = String(file.subRefType);
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
        totalComplied += 1;
      } else {
        totalNotComplied += 1;
      }
      totalFiles += 1;
    });
    const totalPercent =
      totalFiles > 0 ? ((totalComplied / totalFiles) * 100).toFixed(2) : "0.00";

    // Add total row (filtered compliance ratio)
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
      "attachment; filename=ComplianceRatio_InsurerDept_OK.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
