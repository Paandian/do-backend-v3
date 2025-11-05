const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const moment = require("moment-timezone");
moment.tz.setDefault("Asia/Kuala_Lumpur");
const app = express();
const path = require("path");

// npm install --save connect-history-api-fallback
// added this line to avoid 404 error on refresh

// Development Mode - Beginning
var history = require("connect-history-api-fallback");
const pathone = __dirname + "/app/views/";
// const pathtwo = __dirname + "/app/uploads/";
const pathtwo = path.join(__dirname, "../uploads");

// added this line to avoid 404 error on refresh
app.use(history());

app.use(express.static(pathone));
app.use(express.static(pathtwo));

// app.use(express.static(path.join(__dirname, "../uploads")));

// End of Development Mode
var corsOptions = {
  origin: "http://localhost:8081",
};

// Original line
// app.use(cors(corsOptions));

//updated with below line to overcome the CORS allow origin error
app.use(cors({ origin: corsOptions, credentials: true }));

// parse requests of content-type - application/json
app.use(bodyParser.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

const db = require("./app/models");
// const Role = db.role;
// const Branch = db.branch;
// const State = db.state;
// const Dept = db.dept;
// const Ins = db.inss;
// const Stage = db.stages;
// const Region = db.region;
// const Handler = db.handler;
// const Docupload = db.docupload;

// after the first sync use the below code
// db.sequelize.sync();

// initial() function helps us to create 3 rows in database.
// In development, you may need to drop existing tables and re-sync database. So you can use force: true as code below.
// For production, just insert these rows manually and use sync() without parameters to avoid dropping data

// db.sequelize.sync({ force: true }).then(() => {
//   console.log("Drop and Resync Db");
//   initial();
// });

// db.sequelize.sync().then(() => {
//   console.log("Resync Db");
//   initial();
// });

const cron = require("node-cron");
const MerimenScheduler = require("./app/schedulers/scheduler");
const SftpService = require("./app/services/sftpService");
const sftpConfig = require("./app/config/sftp.config");

async function initializeMerimenScheduler() {
  const sftpService = new SftpService(sftpConfig);
  const scheduler = new MerimenScheduler(sftpService);

  // Schedule to run every hour
  cron.schedule("0 * * * *", async () => {
    console.log("Running Merimen file processing scheduler...");
    await scheduler.processFiles();
  });

  // Run immediately on startup
  await scheduler.processFiles();
}

// Add timezone check on startup
const timezoneName = moment.tz.guess();
console.log("Server timezone:", timezoneName);
console.log("Current server time:", moment().format("YYYY-MM-DD HH:mm:ss"));

// simple route
app.get("/", (req, res) => {
  // res.json({ message: "Welcome to aasbtech application." }); // Development Mode
  res.sendFile(path + "index.html"); // Production Mode
});

// routes
require("./app/routes/auth.routes")(app);
require("./app/routes/user.routes")(app);
require("./app/routes/member.routes")(app);
require("./app/routes/state.routes")(app);
require("./app/routes/branch.routes")(app);
require("./app/routes/region.routes")(app);
require("./app/routes/tatchart.routes")(app);
require("./app/routes/ins.routes")(app);
require("./app/routes/handler.routes")(app);
require("./app/routes/dept.routes")(app);
require("./app/routes/sub_dept.routes")(app);
require("./app/routes/stage.routes")(app);
require("./app/routes/access.routes")(app);
require("./app/routes/casefile.routes")(app);
require("./app/routes/bulletin.routes")(app);
require("./app/routes/casebybranch.routes")(app);
require("./app/routes/casebyreftype.routes")(app);
require("./app/routes/casestatusref.routes")(app);
require("./app/routes/casestatusbranch.routes")(app);
require("./app/routes/fileUpload.routes")(app);
require("./app/routes/docupload.routes")(app);
require("./app/routes/documents.routes")(app);
require("./app/routes/transfer.routes")(app);
require("./app/routes/transporter.routes")(app);
require("./app/routes/comment.routes")(app);
require("./app/routes/dropbox.routes")(app);
require("./app/routes/claim.routes")(app);
require("./app/routes/mail.routes")(app);
require("./app/routes/merimen.routes")(app);
require("./app/routes/merimenData.routes")(app);
require("./app/routes/sftp.routes")(app);
require("./app/routes/sftpFile.routes")(app); // Add this line

// set port, listen for requests
const PORT = process.env.PROD_PORT || 8090; // Production Mode
// const PORT = process.env.PORT || 8080; // Development Mode
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}.`);
  await initializeMerimenScheduler();
});

// function initial() {
//   // Hardcoded Roles
//   // Role.bulkCreate([
//   //   {
//   //     id: 1,
//   //     name: "ADJUSTER",
//   //     roleCode: "adjuster",
//   //   },
//   //   {
//   //     id: 2,
//   //     name: "ADMIN",
//   //     roleCode: "admin",
//   //   },
//   //   {
//   //     id: 3,
//   //     name: "BRANCH CLERK",
//   //     roleCode: "branchclerk",
//   //   },
//   //   {
//   //     id: 4,
//   //     name: "BRANCH MANAGER",
//   //     roleCode: "branchmanager",
//   //   },
//   //   {
//   //     id: 5,
//   //     name: "CLERK",
//   //     roleCode: "clerk",
//   //   },
//   //   {
//   //     id: 6,
//   //     name: "DIRECTOR",
//   //     roleCode: "director",
//   //   },
//   //   {
//   //     id: 7,
//   //     name: "EDITOR",
//   //     roleCode: "editor",
//   //   },
//   //   {
//   //     id: 8,
//   //     name: "MANAGER",
//   //     roleCode: "manager",
//   //   },
//   //   {
//   //     id: 9,
//   //     name: "ACCOUNT",
//   //     roleCode: "account",
//   //   },
//   // ]);

//   // Hardcoded Stages
//   // Stage.bulkCreate([
//   //   {
//   //     id: 1,
//   //     name: "NEW",
//   //     stageCode: "NEW",
//   //   },
//   //   {
//   //     id: 2,
//   //     name: "PENDING DOCUMENTS",
//   //     stageCode: "PEND",
//   //   },
//   //   {
//   //     id: 3,
//   //     name: "BRANCH ACCEPTANCE",
//   //     stageCode: "BRAC",
//   //   },
//   //   {
//   //     id: 4,
//   //     name: "ADJUSTER ACCEPTANCE",
//   //     stageCode: "ADAC",
//   //   },
//   //   {
//   //     id: 5,
//   //     name: "UNDER INVESTIGATION",
//   //     stageCode: "INVE",
//   //   },
//   //   {
//   //     id: 6,
//   //     name: "PENDING EDITING",
//   //     stageCode: "PEDI",
//   //   },
//   //   {
//   //     id: 7,
//   //     name: "EDITOR ACCEPTANCE",
//   //     stageCode: "EDAC",
//   //   },
//   //   {
//   //     id: 8,
//   //     name: "EDITING",
//   //     stageCode: "EDI",
//   //   },
//   //   {
//   //     id: 9,
//   //     name: "PENDING APPROVAL",
//   //     stageCode: "PAPP",
//   //   },
//   //   {
//   //     id: 10,
//   //     name: "APPROVAL ONHOLD",
//   //     stageCode: "HOLD",
//   //   },
//   //   {
//   //     id: 11,
//   //     name: "PENDING FORMATING",
//   //     stageCode: "PFORM",
//   //   },
//   //   {
//   //     id: 12,
//   //     name: "CLERK ACCEPTANCE",
//   //     stageCode: "CLERK",
//   //   },
//   //   {
//   //     id: 13,
//   //     name: "FORMATTING AND INVOISING",
//   //     stageCode: "FOIN",
//   //   },

//   //   {
//   //     id: 14,
//   //     name: "INVOISING & FINALISATION",
//   //     stageCode: "INFI",
//   //   },
//   //   {
//   //     id: 15,
//   //     name: "DISPATCH",
//   //     stageCode: "DISP",
//   //   },
//   //   {
//   //     id: 16,
//   //     name: "PENDING DISPATCH",
//   //     stageCode: "PDISP",
//   //   },
//   //   {
//   //     id: 17,
//   //     name: "CLOSED",
//   //     stageCode: "CLO",
//   //   },
//   //   {
//   //     id: 18,
//   //     name: "CANCELLED",
//   //     stageCode: "CANC",
//   //   },
//   // ]);

//   // Hardcoded States
//   // State.bulkCreate([
//   //   {
//   //     id: 1,
//   //     name: "Johor",
//   //     stCode: "JHR",
//   //   },
//   //   {
//   //     id: 2,
//   //     name: "Kedah",
//   //     stCode: "KED",
//   //   },
//   //   {
//   //     id: 3,
//   //     name: "Kelantan",
//   //     stCode: "KEL",
//   //   },
//   //   {
//   //     id: 4,
//   //     name: "Melaka",
//   //     stCode: "MEL",
//   //   },
//   //   {
//   //     id: 5,
//   //     name: "Negeri Sembilan",
//   //     stCode: "NES",
//   //   },
//   //   {
//   //     id: 6,
//   //     name: "Pahang",
//   //     stCode: "PAH",
//   //   },
//   //   {
//   //     id: 7,
//   //     name: "Perak",
//   //     stCode: "PER",
//   //   },
//   //   {
//   //     id: 8,
//   //     name: "Perlis",
//   //     stCode: "PEL",
//   //   },
//   //   {
//   //     id: 9,
//   //     name: "Pulau Pinang",
//   //     stCode: "PEN",
//   //   },
//   //   {
//   //     id: 10,
//   //     name: "Sabah",
//   //     stCode: "SAB",
//   //   },
//   //   {
//   //     id: 11,
//   //     name: "Sarawak",
//   //     stCode: "SAW",
//   //   },
//   //   {
//   //     id: 12,
//   //     name: "Selangor",
//   //     stCode: "SEL",
//   //   },
//   //   {
//   //     id: 13,
//   //     name: "Terengganu",
//   //     stCode: "TER",
//   //   },
//   //   {
//   //     id: 14,
//   //     name: "Wilayah Persekutuan",
//   //     stCode: "WYP",
//   //   },
//   // ]);

//   // Hardcoded Regions-Johor
//   // Region.bulkCreate([
//   //   {
//   //     id: 1,
//   //     branchId: 1,
//   //     name: "Batu Pahat",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 2,
//   //     branchId: 1,
//   //     name: "Johor Bahru Selatan",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 3,
//   //     branchId: 1,
//   //     name: "Johor Bahru Utara",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 4,
//   //     branchId: 1,
//   //     name: "Kluang",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 5,
//   //     branchId: 1,
//   //     name: "Kota Tinggi",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 6,
//   //     branchId: 1,
//   //     name: "Kulai Jaya",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 7,
//   //     branchId: 1,
//   //     name: "Ledang",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 8,
//   //     branchId: 1,
//   //     name: "Mersing",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 9,
//   //     branchId: 1,
//   //     name: "Muar",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 10,
//   //     branchId: 1,
//   //     name: "Nusa Jaya",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 11,
//   //     branchId: 1,
//   //     name: "Pontian",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 12,
//   //     branchId: 1,
//   //     name: "Segamat",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 13,
//   //     branchId: 1,
//   //     name: "Seri Alam",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 14,
//   //     branchId: 2,
//   //     name: "Baling",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 15,
//   //     branchId: 2,
//   //     name: "Bandar Baharu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 16,
//   //     branchId: 2,
//   //     name: "Kota Setar",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 17,
//   //     branchId: 2,
//   //     name: "Kuala Muda",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 18,
//   //     branchId: 2,
//   //     name: "Kubang Pasu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 19,
//   //     branchId: 2,
//   //     name: "Kulim",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 20,
//   //     branchId: 2,
//   //     name: "Langkawi",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 21,
//   //     branchId: 2,
//   //     name: "Padang Terap",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 22,
//   //     branchId: 2,
//   //     name: "Pendang",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 23,
//   //     branchId: 2,
//   //     name: "Sik",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 24,
//   //     branchId: 2,
//   //     name: "Yan",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 25,
//   //     branchId: 3,
//   //     name: "Bachok",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 26,
//   //     branchId: 3,
//   //     name: "Gua Musang",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 27,
//   //     branchId: 3,
//   //     name: "Jeli",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 28,
//   //     branchId: 3,
//   //     name: "Kota Bharu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 29,
//   //     branchId: 3,
//   //     name: "Kuala Krai",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 30,
//   //     branchId: 3,
//   //     name: "Machang",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 31,
//   //     branchId: 3,
//   //     name: "Pasir Mas",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 32,
//   //     branchId: 3,
//   //     name: "Pasir Puteh",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 33,
//   //     branchId: 3,
//   //     name: "Tanah Merah",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 34,
//   //     branchId: 3,
//   //     name: "Tumpat",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 35,
//   //     branchId: 4,
//   //     name: "Alor Gajah",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 36,
//   //     branchId: 4,
//   //     name: "Jasin",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 37,
//   //     branchId: 4,
//   //     name: "Melaka Tengah",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 38,
//   //     branchId: 5,
//   //     name: "Jelebu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 39,
//   //     branchId: 5,
//   //     name: "Jempol",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 40,
//   //     branchId: 5,
//   //     name: "Kuala Pilah",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 41,
//   //     branchId: 5,
//   //     name: "Nilai",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 42,
//   //     branchId: 5,
//   //     name: "Port Dickson",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 43,
//   //     branchId: 5,
//   //     name: "Rembau",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 44,
//   //     branchId: 5,
//   //     name: "Seremban",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 45,
//   //     branchId: 5,
//   //     name: "Tampin",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 46,
//   //     branchId: 6,
//   //     name: "Bentong",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 47,
//   //     branchId: 6,
//   //     name: "Bera",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 48,
//   //     branchId: 6,
//   //     name: "Cameron Highlands",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 49,
//   //     branchId: 6,
//   //     name: "Jerantut",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 50,
//   //     branchId: 6,
//   //     name: "Kuala Lipis",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 51,
//   //     branchId: 6,
//   //     name: "Kuantan",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 52,
//   //     branchId: 6,
//   //     name: "Maran",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 53,
//   //     branchId: 6,
//   //     name: "Pekan",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 54,
//   //     branchId: 6,
//   //     name: "Raub",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 55,
//   //     branchId: 6,
//   //     name: "Rompin",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 56,
//   //     branchId: 6,
//   //     name: "Temerloh",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 57,
//   //     branchId: 7,
//   //     name: "Batu Gajah",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 58,
//   //     branchId: 7,
//   //     name: "Gerik",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 59,
//   //     branchId: 7,
//   //     name: "Hilir Perak",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 60,
//   //     branchId: 7,
//   //     name: "Ipoh",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 61,
//   //     branchId: 7,
//   //     name: "Kampar",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 62,
//   //     branchId: 7,
//   //     name: "Kerian",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 63,
//   //     branchId: 7,
//   //     name: "Kuala Kangsar",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 64,
//   //     branchId: 7,
//   //     name: "Manjung",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 65,
//   //     branchId: 7,
//   //     name: "Pengkalan Hulu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 66,
//   //     branchId: 7,
//   //     name: "Perak Tengah",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 67,
//   //     branchId: 7,
//   //     name: "Selama",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 68,
//   //     branchId: 7,
//   //     name: "Sungai Siput",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 69,
//   //     branchId: 7,
//   //     name: "Taiping",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 70,
//   //     branchId: 7,
//   //     name: "Tanjung Malim",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 71,
//   //     branchId: 7,
//   //     name: "Tapah",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 72,
//   //     branchId: 8,
//   //     name: "Arau",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 73,
//   //     branchId: 8,
//   //     name: "Kangar",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 74,
//   //     branchId: 8,
//   //     name: "Padang Besar",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 75,
//   //     branchId: 9,
//   //     name: "Barat Daya",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 76,
//   //     branchId: 9,
//   //     name: "Seberang Perai Selatan",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 77,
//   //     branchId: 9,
//   //     name: "Seberang Perai Tengah",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 78,
//   //     branchId: 9,
//   //     name: "Seberang Perai Utara",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 79,
//   //     branchId: 9,
//   //     name: "Timur Laut",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 80,
//   //     branchId: 11,
//   //     name: "Beaufort",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 81,
//   //     branchId: 10,
//   //     name: "Beluran",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 82,
//   //     branchId: 10,
//   //     name: "Keningau",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 83,
//   //     branchId: 10,
//   //     name: "Kinabatangan",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 84,
//   //     branchId: 10,
//   //     name: "Kota Belud",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 85,
//   //     branchId: 10,
//   //     name: "Kota Kinabalu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 86,
//   //     branchId: 10,
//   //     name: "Kota Marudu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 87,
//   //     branchId: 10,
//   //     name: "Kudat",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 88,
//   //     branchId: 10,
//   //     name: "Kunak",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 89,
//   //     branchId: 10,
//   //     name: "Labuan",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 90,
//   //     branchId: 10,
//   //     name: "Lahad Datu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 91,
//   //     branchId: 10,
//   //     name: "Papar",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 92,
//   //     branchId: 10,
//   //     name: "Penampang",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 93,
//   //     branchId: 10,
//   //     name: "Ranau",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 94,
//   //     branchId: 10,
//   //     name: "Sandakan",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 95,
//   //     branchId: 10,
//   //     name: "Semporna",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 96,
//   //     branchId: 10,
//   //     name: "Sipitang",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 97,
//   //     branchId: 10,
//   //     name: "Tawau",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 98,
//   //     branchId: 10,
//   //     name: "Tenom",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 99,
//   //     branchId: 10,
//   //     name: "Tuaran",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 100,
//   //     branchId: 11,
//   //     name: "Baram",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 101,
//   //     branchId: 11,
//   //     name: "Bau",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 102,
//   //     branchId: 11,
//   //     name: "Belaga",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 103,
//   //     branchId: 11,
//   //     name: "Betong",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 104,
//   //     branchId: 11,
//   //     name: "Bintulu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 105,
//   //     branchId: 11,
//   //     name: "Dalat",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 106,
//   //     branchId: 11,
//   //     name: "Daro",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 107,
//   //     branchId: 11,
//   //     name: "Julau",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 108,
//   //     branchId: 11,
//   //     name: "Kanowit",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 109,
//   //     branchId: 11,
//   //     name: "Kapit",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 110,
//   //     branchId: 11,
//   //     name: "Kota Samarahan",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 111,
//   //     branchId: 11,
//   //     name: "Kuching",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 112,
//   //     branchId: 11,
//   //     name: "Lawas",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 113,
//   //     branchId: 11,
//   //     name: "Limbang",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 114,
//   //     branchId: 11,
//   //     name: "Lubok Antu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 115,
//   //     branchId: 11,
//   //     name: "Lundu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 116,
//   //     branchId: 11,
//   //     name: "Meradong",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 117,
//   //     branchId: 11,
//   //     name: "Miri",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 118,
//   //     branchId: 11,
//   //     name: "Mukah",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 119,
//   //     branchId: 11,
//   //     name: "Padawan",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 120,
//   //     branchId: 11,
//   //     name: "Saratok",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 121,
//   //     branchId: 11,
//   //     name: "Sarikei",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 122,
//   //     branchId: 11,
//   //     name: "Serian",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 123,
//   //     branchId: 11,
//   //     name: "Sibu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 124,
//   //     branchId: 11,
//   //     name: "Simunjan",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 125,
//   //     branchId: 11,
//   //     name: "Song",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 126,
//   //     branchId: 11,
//   //     name: "Sri Aman",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 127,
//   //     branchId: 11,
//   //     name: "Tatau",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 128,
//   //     branchId: 12,
//   //     name: "Ampang Jaya",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 129,
//   //     branchId: 12,
//   //     name: "Gombak",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 130,
//   //     branchId: 12,
//   //     name: "Hulu Selangor",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 131,
//   //     branchId: 12,
//   //     name: "Kajang",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 132,
//   //     branchId: 12,
//   //     name: "Klang Selatan",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 133,
//   //     branchId: 12,
//   //     name: "Klang Utara",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 134,
//   //     branchId: 12,
//   //     name: "Kuala Langat",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 135,
//   //     branchId: 12,
//   //     name: "Kuala Selangor",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 136,
//   //     branchId: 12,
//   //     name: "Petaling Jaya",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 137,
//   //     branchId: 12,
//   //     name: "Sabak Bernam",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 138,
//   //     branchId: 12,
//   //     name: "Sepang",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 139,
//   //     branchId: 12,
//   //     name: "Serdang",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 140,
//   //     branchId: 12,
//   //     name: "Shah Alam",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 141,
//   //     branchId: 12,
//   //     name: "Subang Jaya",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 142,
//   //     branchId: 12,
//   //     name: "Sungai Buloh",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 143,
//   //     branchId: 13,
//   //     name: "Besut",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 144,
//   //     branchId: 13,
//   //     name: "Dungun",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 145,
//   //     branchId: 13,
//   //     name: "Hulu Terengganu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 146,
//   //     branchId: 13,
//   //     name: "Kemaman",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 147,
//   //     branchId: 13,
//   //     name: "Kuala Terengganu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 148,
//   //     branchId: 13,
//   //     name: "Marang",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 149,
//   //     branchId: 13,
//   //     name: "Setiu",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 150,
//   //     branchId: 14,
//   //     name: "Kuala Lumpur",
//   //     regionCode: "",
//   //   },
//   //   {
//   //     id: 151,
//   //     branchId: 14,
//   //     name: "Putrajaya",
//   //     regionCode: "",
//   //   },
//   // ]);

//   // Hardcoded Departments
//   // Dept.bulkCreate([
//   //   {
//   //     id: 1,
//   //     name: "BI",
//   //     description: "Bodily Injury",
//   //   },
//   //   {
//   //     id: 2,
//   //     name: "OD",
//   //     description: "Own Damage",
//   //   },
//   //   {
//   //     id: 3,
//   //     name: "TPBI",
//   //     description: "Third Party Bodily Injury",
//   //   },
//   // ]);
// }
