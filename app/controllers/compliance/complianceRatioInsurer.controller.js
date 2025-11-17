const db = require("../../models");
const ExcelJS = require("exceljs");
const moment = require("moment");

// Model references
const Casefile = db.casefiles;
const Insurer = db.inss;

// --- Compliance Ratio (By Insurer) - API ---
exports.getComplianceRatioInsurer = async (req, res) => {
  try {
    const { deptId, fileClassId, month } = req.query;
    // Build query filters
    const where = {};
    if (deptId) where.refType = deptId;
    if (fileClassId) where.subRefType = fileClassId;
    if (month) {
      const start = moment(month, "YYYY-MM").startOf("month").toDate();
      const end = moment(month, "YYYY-MM").endOf("month").toDate();
      where.dateClosed = { [db.Sequelize.Op.between]: [start, end] };
    }

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
      where,
      include: [
        { model: Insurer, as: "insurerRef", attributes: ["name"] },
        // ...other necessary includes...
      ],
    });

    // Aggregate data by insurer
    const reportData = [];
    files.forEach((a) => {
      const insurer = a.insurer?.name || "Unknown";
      if (!insurerMap[insurer]) {
        insurerMap[insurer] = {
          insurer,
          complied: 0,
          notComplied: 0,
          total: 0,
        };
      }
      insurerMap[insurer].total += 1;
      if (a.complied) insurerMap[insurer].complied += 1;
      else insurerMap[insurer].notComplied += 1;
    });
    Object.values(insurerMap).forEach((row) => {
      row.percent =
        row.total > 0 ? ((row.complied / row.total) * 100).toFixed(2) : "0.00";
      reportData.push(row);
    });

    // Totals
    const totals = reportData.reduce(
      (acc, row) => {
        acc.complied += row.complied;
        acc.notComplied += row.notComplied;
        acc.total += row.total;
        return acc;
      },
      { complied: 0, notComplied: 0, total: 0 }
    );

    res.json({ reportData, totals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Compliance Ratio (By Insurer) - Excel Export ---
exports.exportComplianceRatioInsurer = async (req, res) => {
  try {
    const { deptId, fileClassId, month } = req.query;
    // Same filter logic as getReport
    const where = {};
    if (deptId) where.refType = deptId;
    if (fileClassId) where.subRefType = fileClassId;
    if (month) {
      const start = moment(month, "YYYY-MM").startOf("month").toDate();
      const end = moment(month, "YYYY-MM").endOf("month").toDate();
      where.dateClosed = { [db.Sequelize.Op.between]: [start, end] };
    }
    const files = await Casefile.findAll({
      where,
      include: [
        { model: Insurer, as: "insurerRef", attributes: ["name"] },
        // ...other necessary includes...
      ],
    });

    // Aggregate data by insurer
    const insurerMap = {};
    files.forEach((a) => {
      const insurer = a.insurer?.name || "Unknown";
      if (!insurerMap[insurer]) {
        insurerMap[insurer] = {
          insurer,
          complied: 0,
          notComplied: 0,
          total: 0,
        };
      }
      insurerMap[insurer].total += 1;
      if (a.complied) insurerMap[insurer].complied += 1;
      else insurerMap[insurer].notComplied += 1;
    });

    // Prepare Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Compliance Ratio (Insurer)");
    sheet.columns = [
      { header: "Insurer", key: "insurer", width: 30 },
      { header: "Complied", key: "complied", width: 15 },
      { header: "Not Complied", key: "notComplied", width: 15 },
      { header: "Total", key: "total", width: 15 },
      { header: "Complied (%)", key: "percent", width: 15 },
    ];
    Object.values(insurerMap).forEach((row) => {
      row.percent =
        row.total > 0 ? ((row.complied / row.total) * 100).toFixed(2) : "0.00";
      sheet.addRow(row);
    });
    // Add totals row
    const totals = Object.values(insurerMap).reduce(
      (acc, row) => {
        acc.complied += row.complied;
        acc.notComplied += row.notComplied;
        acc.total += row.total;
        return acc;
      },
      { complied: 0, notComplied: 0, total: 0 }
    );
    sheet.addRow({
      insurer: "Total",
      complied: totals.complied,
      notComplied: totals.notComplied,
      total: totals.total,
      percent:
        totals.total > 0
          ? ((totals.complied / totals.total) * 100).toFixed(2)
          : "0.00",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=compliance_ratio_insurer.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
