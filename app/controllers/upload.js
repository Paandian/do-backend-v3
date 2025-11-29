const fs = require("fs");
const db = require("../models");
const Image = db.images;
const uploadFiles = async (req, res) => {
  try {
    // console.log(req.file);
    if (req.file == undefined) {
      return res.send(`You must select a file.`);
    }
    Image.create({
      name: req.file.originalname,
    }).then((image) => {
      fs.writeFileSync(
        __basedir + "/app/tmp/" + image.name
        // image.data
      );
      return res.send(`File has been uploaded.`);
    });
  } catch (error) {
    console.log(error);
    return res.send(`Error when trying upload images: ${error}`);
  }
};
module.exports = {
  uploadFiles,
};
