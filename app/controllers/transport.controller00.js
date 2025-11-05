"use strict";
const nodemailer = require("nodemailer");
const moment = require("moment");

const sendActivation = (req, res) => {
  // console.log(req);
  const email = req.email;
  const token = req.resetlink;
  const output = `
  <p>Kindly use this <a href="https://www.aasbtech.com/activate">link</a> to activate your account.</p>
  <p>Your token is ${token}</p>
`;

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "mail.associatedadjusters.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "sys.admin@associatedadjusters.com", // generated ethereal user
      pass: "Abcd/1234", // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"System Admin" <sys.admin@associatedadjusters.com>', // sender address
    to: email, // list of receivers
    subject: "AASB - User Account activation", // Subject line
    text: "Activate Account", // plain text body
    html: output, // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Activation Email Sent!: %s", info.messageId);
    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    // res.render({ msg: "Email has been sent" });
    // res.json({ message: "Mail Sent" });
    // setTimeout(() => {
    //   res.send({ message: "Notification Email Sent" });
    // }, 2500);
  });
};

const notify = (req, res) => {
  const dateAssigned = moment(req.body.dateOfAssign).format("DD/MM/YYYY");
  const output = `
  <!--  <h1>THIS IS A TEST MAIL, PLEASE IGNORE</h1> -->
  <p>There is a new casefile created with below details:</p>

  <h3>Details</h3>
    <ul>
      <li>Name: ${req.body.refType}</li>
      <li>Sub-Category: ${req.body.subRefType}</li>
      <li>Date Of Assigned: ${dateAssigned}</li>
      <li>Branch: ${req.body.branch}</li>
      <li>Insurer: ${req.body.insurer}</li>
    </ul>
`;

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "mail.associatedadjusters.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "sys.admin@associatedadjusters.com", // generated ethereal user
      pass: "Abcd/1234", // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"System Admin" <sys.admin@associatedadjusters.com>', // sender address
    to: "sys.admin@associatedadjusters.com", // list of receivers
    subject: "A new Casefile generated", // Subject line
    text: "Hello world?", // plain text body
    html: output, // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    // res.render({ msg: "Email has been sent" });
    // res.json({ message: "Mail Sent" });
    setTimeout(() => {
      res.send({ message: "Notification Email Sent" });
    }, 2500);
  });
};

const branch = (req, res) => {
  console.log(req.body);
  const dateAssigned = moment(req.body.dateOfAssign).format("DD/MM/YYYY");
  const output = `
  <!--  <h1>THIS IS A TEST MAIL, PLEASE IGNORE</h1> -->
  <p>Dear Admin,</p>
  <p>You have a new case for acceptance, kindly accept the case and assign it to the respective adjuster. Case details;</p>

  <h3>Details</h3>
    <ul>
    <li>Vehicle Number: ${req.body.vehicleNo || "TBA"}</li>
    <li>Ref Number: AA/${req.body.refTypeCode}/${req.body.subRefCode}/${
    req.body.id
  }/${req.body.branchCode}</li>
    <li>Insurer: ${req.body.insurer}</li>
    <li>Date Of Assigned: ${dateAssigned}</li>
      <li>Department: ${req.body.refType}</li>
      <li>Sub-Category: ${req.body.subRefType}</li>
      <li>Branch: ${req.body.branch}</li>
      </ul>
      <br>
      <p>Thank you</>
`;
  const sendTo = req.body.recipient;

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "mail.associatedadjusters.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "sys.admin@associatedadjusters.com", // generated ethereal user
      pass: "Abcd/1234", // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"System Admin" <sys.admin@associatedadjusters.com>', // sender address
    // to: "sys.admin@associatedadjusters.com", // list of receivers
    to: sendTo + "," + "sys.admin@associatedadjusters.com", // list of receivers
    subject: "A new Casefile has been assigned to your Branch", // Subject line
    text: "Hello world?", // plain text body
    html: output, // html body
  };
  console.log(mailOptions.to);

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    // res.render({ msg: "Email has been sent" });
    // res.json({ message: "Mail Sent" });
    setTimeout(() => {
      res.send({ message: "Notification Email Sent" });
    }, 2500);
  });
};

const adjuster = (req, res) => {
  console.log(req.body);
  const dateAssigned = moment(req.body.dateOfAssign).format("DD/MM/YYYY");
  const output = `
  <!--  <h1>THIS IS A TEST MAIL, PLEASE IGNORE</h1> -->
  <p>Dear Adjuster,</p>
    <p>You have a new case for acceptance, kindly accept the case and proceed with your investigation, Case details;</p>
  
    <h3>Details</h3>
      <ul>
      <li>Vehicle Number: ${req.body.vehicleNo || "TBA"}</li>
      <li>Ref Number: AA/${req.body.refTypeCode}/${req.body.subRefCode}/${
    req.body.id
  }/${req.body.branchCode}</li>
      <li>Insurer: ${req.body.insurer}</li>
      <li>Date Of Assigned: ${dateAssigned}</li>
        <li>Department: ${req.body.refType}</li>
        <li>Sub-Category: ${req.body.subRefType}</li>
        <li>Branch: ${req.body.branch}</li>
        </ul>
        <br>
        <p>Thank you</>

`;
  const sendTo = req.body.recipient;
  console.log(sendTo);

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "mail.associatedadjusters.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "sys.admin@associatedadjusters.com", // generated ethereal user
      pass: "Abcd/1234", // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"System Admin" <sys.admin@associatedadjusters.com>', // sender address
    // to: "sys.admin@associatedadjusters.com", // list of receivers
    to: sendTo + "," + "sys.admin@associatedadjusters.com", // list of receivers
    subject: "A new Casefile has been assigned to you for investigation", // Subject line
    text: "Hello world?", // plain text body
    html: output, // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    // res.render({ msg: "Email has been sent" });
    // res.json({ message: "Mail Sent" });
    setTimeout(() => {
      res.send({ message: "Notification Email Sent" });
    }, 2500);
  });
};
const editor = (req, res) => {
  console.log(req.body);
  const dateAssigned = moment(req.body.dateOfAssign).format("DD/MM/YYYY");
  const output = `
  <!--  <h1>THIS IS A TEST MAIL, PLEASE IGNORE</h1> -->
    <p>Dear Admin/Manager,</p>
    <p>You have received a report for editing from the adjuster, kindly assign it to the respective editor. Case details;</p>
  
    <h3>Details</h3>
      <ul>
      <li>Vehicle Number: ${req.body.vehicleNo || "TBA"}</li>
      <li>Ref Number: AA/${req.body.refTypeCode}/${req.body.subRefCode}/${
    req.body.id
  }/${req.body.branchCode}</li>
      <li>Insurer: ${req.body.insurer}</li>
      <li>Date Of Assigned: ${dateAssigned}</li>
        <li>Department: ${req.body.refType}</li>
        <li>Sub-Category: ${req.body.subRefType}</li>
        <li>Branch: ${req.body.branch}</li>
        </ul>
        <br>
        <p>Thank you</>

`;
  const sendTo = req.body.recipient;
  console.log(sendTo);

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "mail.associatedadjusters.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "sys.admin@associatedadjusters.com", // generated ethereal user
      pass: "Abcd/1234", // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"System Admin" <sys.admin@associatedadjusters.com>', // sender address
    // to: "sys.admin@associatedadjusters.com", // list of receivers
    to: sendTo, // list of receivers
    // to: sendTo + "," + "sys.admin@associatedadjusters.com", // list of receivers
    subject: "Adjuster has completed Investigation, please assign Editor", // Subject line
    text: "Hello world?", // plain text body
    html: output, // html body
  };
  console.log(mailOptions.to);
  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    // res.render({ msg: "Email has been sent" });
    // res.json({ message: "Mail Sent" });
    setTimeout(() => {
      res.send({ message: "Notification Email Sent" });
    }, 2500);
  });
};

const editorAccept = (req, res) => {
  console.log(req.body);
  const dateAssigned = moment(req.body.dateOfAssign).format("DD/MM/YYYY");
  const output = `
  <!--  <h1>THIS IS A TEST MAIL, PLEASE IGNORE</h1> -->
    <p>Dear Editor,</p>
    <p>You have a received a report for editing, kindly accept the report for editing. Case details;</p>
  
    <h3>Details</h3>
      <ul>
      <li>Vehicle Number: ${req.body.vehicleNo || "TBA"}</li>
      <li>Ref Number: AA/${req.body.refTypeCode}/${req.body.subRefCode}/${
    req.body.id
  }/${req.body.branchCode}</li>
      <li>Insurer: ${req.body.insurer}</li>
      <li>Date Of Assigned: ${dateAssigned}</li>
        <li>Department: ${req.body.refType}</li>
        <li>Sub-Category: ${req.body.subRefType}</li>
        <li>Branch: ${req.body.branch}</li>
        </ul>
        <br>
        <p>Thank you</>

`;
  const sendTo = req.body.recipient;
  // console.log(sendTo);

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "mail.associatedadjusters.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "sys.admin@associatedadjusters.com", // generated ethereal user
      pass: "Abcd/1234", // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"System Admin" <sys.admin@associatedadjusters.com>', // sender address
    // to: "sys.admin@associatedadjusters.com", // list of receivers
    to: sendTo + "," + "sys.admin@associatedadjusters.com", // list of receivers
    subject: "Manager has assigned a report for editing, please Accept", // Subject line
    text: "Hello world?", // plain text body
    html: output, // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    // res.render({ msg: "Email has been sent" });
    // res.json({ message: "Mail Sent" });
    setTimeout(() => {
      res.send({ message: "Notification Email Sent" });
    }, 2500);
  });
};
const managerApproval = (req, res) => {
  console.log(req.body);
  const dateAssigned = moment(req.body.dateOfAssign).format("DD/MM/YYYY");
  const output = `
  <!--  <h1>THIS IS A TEST MAIL, PLEASE IGNORE</h1> -->
    <p>Dear Manager,</p>
    <p>You have a received a report for approval, kindly approve the report and check the claims submitted by the adjuster. Case details;</p>
  
    <h3>Details</h3>
      <ul>
      <li>Vehicle Number: ${req.body.vehicleNo || "TBA"}</li>
      <li>Ref Number: AA/${req.body.refTypeCode}/${req.body.subRefCode}/${
    req.body.id
  }/${req.body.branchCode}</li>
      <li>Insurer: ${req.body.insurer}</li>
      <li>Date Of Assigned: ${dateAssigned}</li>
        <li>Department: ${req.body.refType}</li>
        <li>Sub-Category: ${req.body.subRefType}</li>
        <li>Branch: ${req.body.branch}</li>
        </ul>
        <br>
        <p>Thank you</>

`;
  const sendTo = req.body.recipient;
  // console.log(sendTo);

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "mail.associatedadjusters.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "sys.admin@associatedadjusters.com", // generated ethereal user
      pass: "Abcd/1234", // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"System Admin" <sys.admin@associatedadjusters.com>', // sender address
    // to: "sys.admin@associatedadjusters.com", // list of receivers
    to: sendTo + "," + "sys.admin@associatedadjusters.com", // list of receivers
    subject:
      "Editor has completed editing, please approve and check the claims submitted by the adjuster", // Subject line
    text: "Hello world?", // plain text body
    html: output, // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    // res.render({ msg: "Email has been sent" });
    // res.json({ message: "Mail Sent" });
    setTimeout(() => {
      res.send({ message: "Notification Email Sent" });
    }, 2500);
  });
};
const assignClerk = (req, res) => {
  console.log(req.body);
  const dateAssigned = moment(req.body.dateOfAssign).format("DD/MM/YYYY");
  const output = `
  <!--  <h1>THIS IS A TEST MAIL, PLEASE IGNORE</h1> -->
 
    <p>Dear Clerk,</p>
    <p>You have a received a case to finalise, kindly finalise and generate invoice. Case details;</p>
  
    <h3>Details</h3>
      <ul>
      <li>Vehicle Number: ${req.body.vehicleNo || "TBA"}</li>
      <li>Ref Number: AA/${req.body.refTypeCode}/${req.body.subRefCode}/${
    req.body.id
  }/${req.body.branchCode}</li>
      <li>Insurer: ${req.body.insurer}</li>
      <li>Date Of Assigned: ${dateAssigned}</li>
        <li>Department: ${req.body.refType}</li>
        <li>Sub-Category: ${req.body.subRefType}</li>
        <li>Branch: ${req.body.branch}</li>
        </ul>
        <br>
        <p>Thank you</>

`;
  const sendTo = req.body.recipient;
  // console.log(sendTo);

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "mail.associatedadjusters.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "sys.admin@associatedadjusters.com", // generated ethereal user
      pass: "Abcd/1234", // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"System Admin" <sys.admin@associatedadjusters.com>', // sender address
    // to: "sys.admin@associatedadjusters.com", // list of receivers
    to: sendTo + "," + "sys.admin@associatedadjusters.com", // list of receivers
    subject:
      "A Casefile has been assigned to you. Kindly finalise and generate invoice", // Subject line
    text: "Hello world?", // plain text body
    html: output, // html body
  };
  console.log(mailOptions.to);

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    // res.render({ msg: "Email has been sent" });
    // res.json({ message: "Mail Sent" });
    setTimeout(() => {
      res.send({ message: "Notification Email Sent" });
    }, 2500);
  });
};

const resetPassword = (req, res) => {
  // console.log(req);
  const email = req.email;
  const token = req.resetlink;
  const output = `
  <p>You requested to reset your password, kindly use this <a href="https://www.aasbtech.com/reset">link</a> to reset your password</p>
  <p>Your token is ${token}</p>
`;

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "mail.associatedadjusters.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "sys.admin@associatedadjusters.com", // generated ethereal user
      pass: "Abcd/1234", // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"System Admin" <sys.admin@associatedadjusters.com>', // sender address
    to: email, // list of receivers
    subject: "Password RESET token", // Subject line
    text: "Reset Password?", // plain text body
    html: output, // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    // res.render({ msg: "Email has been sent" });
    // res.json({ message: "Mail Sent" });
    // setTimeout(() => {
    //   res.send({ message: "Notification Email Sent" });
    // }, 2500);
  });
};

module.exports = {
  notify,
  branch,
  adjuster,
  editor,
  editorAccept,
  managerApproval,
  assignClerk,
  resetPassword,
  sendActivation,
};
