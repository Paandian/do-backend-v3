const uploadFile = require("../middleware/uploadDoc");
const db = require("../models");
const fs = require("fs");
const path = require("path");
const Member = db.user;
const upload = async (req, res) => {
  try {
    await uploadFile(req, res);
    if (req.file == undefined) {
      return res.status(400).send({ message: "Please upload a file!" });
    }

    // const directoryPath = path.join(__dirname, "../../../docs");

    // console.log(res.req.file.filename);
    const uploadedFilename = res.req.file.filename;
    res.status(200).send({
      // name: res.req.file.originalname,
      name: uploadedFilename,
      message: "File uploaded successfully: " + req.file.originalname,
    });
  } catch (err) {
    if (err.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File size cannot be larger than 4MB!",
      });
    }
    console.log(err),
      res.status(500).send({
        message: `Could not upload the file: ${req.file.originalname}. ${err}`,
      });
  }
};
const getListFiles = (req, res) => {
  const directoryPath = path.join(__dirname, "../../../docs");

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
      });
    });
    res.status(200).send(fileInfos);
  });
};
const download = (req, res) => {
  const fileName = req.params.name;
  const directoryPath = path.join(__dirname, "../../../docs/");
  res.download(directoryPath + fileName, fileName, (err) => {
    if (err) {
      res.status(500).send({
        message: "Could not download the file. " + err,
      });
    }
  });
};
module.exports = {
  upload,
  getListFiles,
  download,
};
