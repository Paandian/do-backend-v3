const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const moment = require("moment-timezone");
const path = require("path");
const history = require("connect-history-api-fallback");

moment.tz.setDefault("Asia/Kuala_Lumpur");
require("dotenv").config();

// Environment configuration
const isProd = process.env.NODE_ENV === "production";
const PORT = isProd
  ? process.env.PROD_PORT || 8090
  : process.env.DEV_PORT || 8080;
const CORS_ORIGIN = isProd
  ? process.env.PROD_CORS_ORIGIN || "http://localhost:8090"
  : process.env.DEV_CORS_ORIGIN || "http://localhost:8081";

// Initialize Express
const app = express();
global.__basedir = __dirname;

// CORS Configuration
const corsOptions = {
  origin: CORS_ORIGIN,
  credentials: true,
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database Configuration
const db = require("./app/models");

// Scheduler Configuration
const cron = require("node-cron");
const MerimenScheduler = require("./app/schedulers/scheduler");
const SftpService = require("./app/services/sftpService");
const sftpConfig = require("./app/config/sftp.config");

// Initialize Merimen Scheduler
async function initializeMerimenScheduler() {
  const sftpService = new SftpService(sftpConfig);
  const scheduler = new MerimenScheduler(sftpService);

  cron.schedule("0 * * * *", async () => {
    console.log("Running Merimen file processing scheduler...");
    await scheduler.processFiles();
  });

  await scheduler.processFiles();
}

// Timezone logging
const timezoneName = moment.tz.guess();
console.log("Server timezone:", timezoneName);
console.log("Current server time:", moment().format("YYYY-MM-DD HH:mm:ss"));

// Root route
app.get("/", (req, res) => {
  if (isProd) {
    res.sendFile(
      path.join(__dirname, process.env.STATIC_PATH || "app/views", "index.html")
    );
  } else {
    res.json({ message: "Welcome to aasbtech application." });
  }
});

// Load all routes
[
  "auth",
  "user",
  "member",
  "state",
  "branch",
  "region",
  "tatchart",
  "ins",
  "handler",
  "dept",
  "sub_dept",
  "stage",
  "access",
  "casefile",
  "bulletin",
  "casebybranch",
  "casebyreftype",
  "casestatusref",
  "casestatusbranch",
  "fileUpload",
  "docupload",
  "documents",
  "transfer",
  "transporter",
  "comment",
  "dropbox",
  "claim",
  "mail",
  "merimen",
  "merimenData",
  "sftp",
  "sftpFile",
  "compliance",
].forEach((route) => {
  require(`./app/routes/${route}.routes`)(app);
});

// Production-only middleware (move AFTER API routes)
if (isProd) {
  const staticPath = path.join(
    __dirname,
    process.env.STATIC_PATH || "app/views"
  );
  const uploadsPath = path.join(
    __dirname,
    process.env.UPLOADS_PATH || "../uploads"
  );

  app.use(history());
  app.use(express.static(staticPath));
  app.use(express.static(uploadsPath));
  console.log("Production mode: Static paths configured");
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(
    `Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
  console.log(`CORS origin: ${CORS_ORIGIN}`);

  // Only run Merimen scheduler in production
  if (isProd) {
    console.log("Initializing Merimen scheduler (production mode)...");
    await initializeMerimenScheduler();
  } else {
    console.log("Merimen scheduler disabled in development mode");
  }
});
