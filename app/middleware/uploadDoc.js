const util = require("util");
const multer = require("multer");
const path = require("path");
const maxSize = 4 * 1024 * 1024;

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
    // cb(null, __basedir + "/resources/static/assets/uploads/");
    cb(null, path.join(__dirname, "../../../docs"));
    // let destination = path.join(__dirname, "../docs");

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
