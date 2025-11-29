const util = require("util");
const multer = require("multer");
const path = require("path");
const maxSize = 4 * 1024 * 1024;

// Load environment variables
const dotenv = require("dotenv");
dotenv.config();

const DOCS_PATH =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_DOCS_PATH
    : process.env.DEV_DOCS_PATH;

//imageFilter added to validate images only
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb("Please upload only images.", false);
  }
};

let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(DOCS_PATH));

    // cb(null, "/app/uploads/");
  },
  filename: (req, file, cb) => {
    // console.log(file.originalname);

    const uniqueSuffix = `${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000
    )}${path.extname(file.originalname)}`;
    cb(null, file.fieldname + "-" + uniqueSuffix);

    // cb(      null,      file.fieldname + "-" + Date.now() + path.extname(file.originalname)    );
  },
});
let uploadFile = multer({
  storage: storage,
  limits: { fileSize: maxSize },
  // fileFilter: imageFilter,
}).single("file");

// below line to upload to a folder only
let uploadFileMiddleware = util.promisify(uploadFile);

//below line to upload to a folder and updating MySQL
// let uploadFileMiddleware = multer({
//   storage: storage,
//   limits: { fileSize: maxSize },
//   fileFilter: imageFilter,
// });
module.exports = uploadFileMiddleware;
