const uploadFile = require("../middleware/upload");
const db = require("../models");
const fs = require("fs");
const path = require("path");
// Load environment variables
const dotenv = require("dotenv");
dotenv.config();

const UPLOADS_PATH =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_UPLOADS_PATH
    : process.env.DEV_UPLOADS_PATH;

const Member = db.user;
const upload = async (req, res) => {
  try {
    await uploadFile(req, res);
    if (req.file == undefined) {
      return res.status(400).send({ message: "Please upload a file!" });
    }
    res.status(200).send({
      message: "File uploaded successfully: " + req.file.originalname,
    });
  } catch (err) {
    if (err.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File size cannot be larger than 2MB!",
      });
    }
    res.status(500).send({
      message: `Could not upload the file:  ${err}`,
    });
  }
};
const getListFiles = (req, res) => {
  const directoryPath = path.resolve(UPLOADS_PATH);

  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      res.status(500).send({
        message: "Unable to scan files!",
      });
    }
    let fileInfos = [];
    files.forEach((file) => {
      fileInfos.push({
        name: file,
        // url: baseUrl + file,
      });
    });
    res.status(200).send(fileInfos);
  });
};
// const download = (req, res) => {
//   const fileName = req.params.name;
//   const directoryPath = __basedir + "/app/uploads/";
//   res.download(directoryPath + fileName, fileName, (err) => {
//     if (err) {
//       res.status(500).send({
//         message: "Could not download the file. " + err,
//       });
//     }
//   });
// };
module.exports = {
  upload,
  getListFiles,
  // download,
};
