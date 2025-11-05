const db = require("../models");
// const Dropbox = db.casefiles;
const Dropbox = db.dropboxes;
const path = require("path");
const readXlsxFile = require("read-excel-file/node");

const fs = require("fs");
const { promisify } = require("util");

const unlinkAsync = promisify(fs.unlink);

const upload = async (req, res) => {
  try {
    if (req.file == undefined) {
      return res.status(400).send("Please upload an excel file!");
    }

    let directoryPath = path.join(
      __dirname,
      "../../../temp/" + req.file.filename
    );

    await readXlsxFile(directoryPath).then((rows) => {
      // skip header
      rows.shift();

      let casefiles = [];

      rows.forEach((row) => {
        let casefile = {
          //   id: row[0],
          fileStatus: "INC",
          refType: row[1],
          subRefType: row[2],
          insurer: row[3],
          claimNo: row[4],
          vehicleNo: row[5],
          dateOfAssign: row[6],
          dateOfLoss: row[7],
        };

        casefiles.push(casefile);
      });

      Dropbox.bulkCreate(casefiles)
        .then(() => {
          res.status(200).send({
            message: "Uploaded the file successfully: " + req.file.originalname,
          });
        })
        .catch((error) => {
          res.status(500).send({
            message: "Fail to import data into database!",
            error: error.message,
          });
        });
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Could not upload the file: " + req.file.originalname,
    });
  }

  try {
    let directoryPath = path.join(
      __dirname,
      "../../../temp/" + req.file.filename
    );

    unlinkAsync(directoryPath);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Could not delete the file: " + req.file.originalname,
    });
  }
};

const getCasefiles = (req, res) => {
  Dropbox.findAll()
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving casefiles.",
      });
    });
};

module.exports = {
  upload,
  getCasefiles,
};
