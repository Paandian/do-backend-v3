// to use this script, run `node scripts/generateDummyData.js` in the terminal
const fs = require("fs");
const moment = require("moment");

function generateDummyData(numRows = 10) {
  const headers = [
    "claim_action",
    "merimen_case_id",
    "claim_type",
    "insurance_claim_no",
    "insured_name",
    "insured_id_no",
    "insured_tel",
    "insured_veh_reg_no",
    "date_of_loss",
    "time_of_loss",
    "policy_cover_note_no",
    "repairer_name",
    "handling_insurer",
    "claimant_insurer",
    "assignment_date",
    "cancellation_date",
    "editing_date",
    "adj_asg_remarks",
    "place_of_loss_postcode",
    "recommended_reserve",
    "adj_provi_fee",
    "police_report_date",
    "police_report_time",
  ].join(",");

  const rows = [];
  const actions = ["New", "Update", "Cancel", "Urgent"];
  const claimTypes = ["Motor", "Fire", "Marine", "Personal Accident"];
  const repairers = [
    "ABC Workshop",
    "XYZ Motors",
    "Quick Fix Auto",
    "Premium Service",
  ];
  const insurers = [
    "Etiqa Takaful (KL)",
    "AXA Affin (PJ)",
    "Allianz (JB)",
    "Zurich (PG)",
  ];
  const postcodes = ["50100", "47301", "81100", "11600", "40150"];

  for (let i = 0; i < numRows; i++) {
    const dateOfLoss = moment().subtract(
      Math.floor(Math.random() * 30),
      "days"
    );
    const assignmentDate = moment(dateOfLoss).add(1, "days");

    const row = [
      actions[Math.floor(Math.random() * actions.length)],
      `MER${moment().format("YYYY")}${String(i + 1).padStart(4, "0")}`,
      claimTypes[Math.floor(Math.random() * claimTypes.length)],
      `CLM/${moment().format("YYYY")}/${String(i + 1).padStart(3, "0")}`,
      `Test Customer ${i + 1}`,
      `ID${Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0")}`,
      `01${Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, "0")}`,
      `${["WA", "VB", "JK"][Math.floor(Math.random() * 3)]}${Math.floor(
        Math.random() * 10000
      )}`,
      dateOfLoss.format("YYYY-MM-DD"),
      dateOfLoss.format("HH:mm"),
      `POL${moment().format("YYYY")}${String(i + 1).padStart(4, "0")}`,
      repairers[Math.floor(Math.random() * repairers.length)],
      insurers[Math.floor(Math.random() * insurers.length)],
      insurers[Math.floor(Math.random() * insurers.length)],
      assignmentDate.format("YYYY-MM-DD HH:mm:ss"),
      "", // cancellation_date left empty
      assignmentDate.format("YYYY-MM-DD HH:mm:ss"),
      `Sample claim case ${i + 1}`,
      postcodes[Math.floor(Math.random() * postcodes.length)],
      (Math.random() * 10000).toFixed(2),
      (Math.random() * 500).toFixed(2),
      dateOfLoss.format("YYYY-MM-DD"),
      dateOfLoss.format("HH:mm"),
    ].join(",");

    rows.push(row);
  }

  return `${headers}\n${rows.join("\n")}`;
}

// Generate and save the file
const outputPath = "./merimenData_template.csv";
fs.writeFileSync(outputPath, generateDummyData());
console.log(`Generated dummy data CSV at: ${outputPath}`);
