module.exports = (app) => {
  const mail = require("../controllers/transporter.controller");
  // const nodemailer = require("nodemailer");

  var router = require("express").Router();

  router.post("/", mail.notify);
  router.post("/branch", mail.branch);
  router.post("/adjuster", mail.adjuster);
  router.post("/editor", mail.editor);
  router.post("/editorAccept", mail.editorAccept);
  router.post("/managerApproval", mail.managerApproval);
  router.post("/assignClerk", mail.assignClerk);

  // router.post("/", mail.notify, (req, res) => {
  //   res.json({ message: "Server Responding" }); // Development Mode
  //   // res.sendFile(path + "index.html"); // Production Mode
  // });

  app.use("/api/send", router);
};
