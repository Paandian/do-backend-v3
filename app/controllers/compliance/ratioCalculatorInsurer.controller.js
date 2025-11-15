const db = require("../../models");
const ExcelJS = require("exceljs");

// Ratio Calculator by Closed Files (Insurer) - Excel Export
exports.exportRatioCalculatorInsurer = async (req, res) => {
  try {
    const { deptGroup, insurerId, month } = req.query;
    if (!deptGroup || !insurerId || !month)
      return res.status(400).json({ message: "Missing required parameters" });

    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    // Get TPBI department id
    const tpbiDept = await db.dept.findOne({ where: { name: "TPBI" } });
    const tpbiDeptId = tpbiDept ? tpbiDept.id : null;

    // Build department filter
    let deptIds = [];
    if (deptGroup === "TPBI" && tpbiDeptId) {
      deptIds = [tpbiDeptId];
    } else if (deptGroup === "MISC" && tpbiDeptId) {
      // All except TPBI
      const allDepts = await db.dept.findAll({ attributes: ["id"] });
      deptIds = allDepts.map((d) => d.id).filter((id) => id !== tpbiDeptId);
    }

    // Get insurer name
    const insurer = await db.inss.findByPk(insurerId);
    const insurerName = insurer ? insurer.name : "INSURER";

    // Fetch closed files for selected month, insurer, and department group
    const where = {
      fileStatus: { [db.Sequelize.Op.in]: ["CLO", "CLOSED"] },
      insurer: insurerId,
      dateClosed: { [db.Sequelize.Op.between]: [startDate, endDate] },
      ...(deptIds.length > 0 && { refType: deptIds }),
    };

    const files = await db.casefiles.findAll({
      where,
      attributes: [
        "vehicleNo",
        "branch",
        // "refNo",
        "refType",
        "invTotal", // <-- use invTotal instead of amount
        "dateOfAssign",
        "dateClosed",
        "id",
      ],
      order: [["dateClosed", "ASC"]],
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

    // Get department names
    const deptList = await db.dept.findAll({ attributes: ["id", "name"] });
    const deptMap = {};
    deptList.forEach((d) => {
      deptMap[d.id] = d.name;
    });

    // Helper to generate AASB reference (similar to showAasbRef)
    function getAasbRef(file) {
      // Example: AA/TPBI/163704/21/KB
      // AA = prefix, TPBI = dept, 163704 = runningNo, 21 = year, KB = branch code
      const prefix = "AA";
      const deptName = deptMap[file.refType] || "";
      const runningNo = file.id ? String(file.id).padStart(6, "0") : "";
      const year = file.dateOfAssign
        ? String(new Date(file.dateOfAssign).getFullYear()).slice(-2)
        : "";
      const branchCode =
        branchMap[file.branch] && branchMap[file.branch].split(" ").length > 0
          ? branchMap[file.branch]
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
          : "";
      return `${prefix}/${deptName}/${runningNo}/${year}/${branchCode}`;
    }

    // Excel generation
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Ratio Calculator");

    // Row 1: Insurer name (capital, bold, calibri 16)
    sheet.addRow([insurerName.toUpperCase()]);
    sheet.mergeCells("A1:I1");
    const row1 = sheet.getRow(1);
    row1.height = 24;
    row1.getCell(1).font = { name: "Calibri", size: 16, bold: true };
    row1.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

    // Row 2: RATIO - MONTH OCT 2022 (capital, bold, calibri 11, row height:48)
    const monthObj = new Date(`${month}-01`);
    const monthName = monthObj
      .toLocaleString("default", { month: "long" })
      .toUpperCase();
    const year = monthObj.getFullYear();
    const ratioTitle = `RATIO - MONTH ${monthName} ${year}`;
    sheet.addRow([ratioTitle]);
    sheet.mergeCells("A2:I2");
    const row2 = sheet.getRow(2);
    row2.height = 48;
    row2.getCell(1).font = { name: "Calibri", size: 11, bold: true };
    row2.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

    // Row 3: Legend (calibri 11, bold)
    // legend.forEach((text, idx) => {
    //   sheet.addRow([text]);
    //   sheet.mergeCells(`A${3 + idx}:H${3 + idx}`);
    //   const legendRow = sheet.getRow(3 + idx);
    //   legendRow.height = 18;
    //   legendRow.getCell(1).font = { name: "Calibri", size: 11, bold: true };
    //   legendRow.getCell(1).alignment = {
    //     vertical: "middle",
    //     horizontal: "left",
    //   };
    // });

    // Row 3: Table header
    const headerValues = [
      "NO",
      "VEHICLENO",
      "BRANCH",
      "REF",
      "TYPE",
      "AMOUNT",
      "DOA",
      "DOS",
      "DAYS",
    ];
    sheet.addRow(headerValues);
    const headerRow = sheet.getRow(3);
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
        fgColor: { argb: "FF76933C" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.value = String(cell.value).toUpperCase();
    });

    // Calculate days for each file and sort descending by days
    const filesWithDays = files.map((file) => {
      let days = 0;
      if (file.dateOfAssign && file.dateClosed) {
        days = Math.abs(
          Math.floor(
            (new Date(file.dateClosed) - new Date(file.dateOfAssign)) /
              (1000 * 60 * 60 * 24)
          )
        );
      }
      return { ...(file.get ? file.get() : file), days };
    });
    filesWithDays.sort((a, b) => b.days - a.days);

    // If no data, send alert response instead of generating Excel
    if (filesWithDays.length === 0) {
      return res.status(200).json({
        alert:
          "No data found for the selected filters. Excel file not generated.",
      });
    }

    // Row 4+: Data rows (descending by days)
    let rowIdx = sheet.getRow(3).number + 1;
    filesWithDays.forEach((file, i) => {
      const values = [
        i + 1,
        file.vehicleNo || "",
        branchMap[file.branch] || "",
        getAasbRef(file),
        deptMap[file.refType] || "",
        file.invTotal
          ? Number(file.invTotal).toLocaleString("en-MY", {
              minimumFractionDigits: 2,
            })
          : "",
        file.dateOfAssign
          ? new Date(file.dateOfAssign).toLocaleDateString("en-GB")
          : "",
        file.dateClosed
          ? new Date(file.dateClosed).toLocaleDateString("en-GB")
          : "",
        file.days,
      ];
      sheet.addRow(values);
      const dataRow = sheet.getRow(rowIdx);
      dataRow.height = 18;
      for (let col = 1; col <= 9; col++) {
        dataRow.getCell(col).font = {
          name: "Calibri",
          size: 10,
          bold: col === 9, // Days column bold
        };
        dataRow.getCell(col).alignment = {
          vertical: "middle",
          horizontal: col === 6 ? "right" : "center",
        };
        dataRow.getCell(col).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        dataRow.getCell(col).value = String(
          dataRow.getCell(col).value
        ).toUpperCase();
      }
      rowIdx++;
    });

    // Set column widths
    sheet.getColumn(1).width = 6; // NO
    sheet.getColumn(2).width = 14; // VEHICLENO
    sheet.getColumn(3).width = 18; // BRANCH
    sheet.getColumn(4).width = 26; // REF
    sheet.getColumn(5).width = 10; // TYPE
    sheet.getColumn(6).width = 14; // AMOUNT
    sheet.getColumn(7).width = 12; // DOA
    sheet.getColumn(8).width = 12; // DOS
    sheet.getColumn(9).width = 8; // DAYS

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=RatioCalculator_${insurerName}_${month}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
