"use strict";
const nodemailer = require("nodemailer");
const moment = require("moment-timezone"); // Change to moment-timezone
const cron = require("node-cron");
const db = require("../models");
const Casefile = db.casefiles;
const TatChart = db.tatchart;
const User = db.user;
const Op = db.Sequelize.Op;

// Use Gmail SMTP for testing
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: "florasmarttv@gmail.com", // replace with your Gmail
//     pass: "saturday/09", // replace with your app password
//   },
//   debug: true,
// });

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
// let mailOptions = {
//   from: '"System Admin" <sys.admin@associatedadjusters.com>', // sender address
//   to: email, // list of receivers
//   subject: "AASB - User Account activation", // Subject line
//   text: "Activate Account", // plain text body
//   html: output, // html body
// };

// Simplified connection verification
const verifyConnection = async () => {
  console.log("Verifying SMTP connection...");
  // try {
  //   const verification = await transporter.verify();
  //   console.log("Gmail SMTP connection verified");
  //   return true;
  // } catch (error) {
  //   console.error("SMTP Connection Error:", {
  //     message: error.message,
  //     code: error.code,
  //     command: error.command,
  //   });
  //   return false;
  // }
};

// Call verification on startup
// verifyConnection();

const sendActivation = (req, res) => {
  // console.log(req);
  const email = req.email;
  const token = req.resetlink;
  const output = `
  <p>Kindly use this <a href="https://www.aasbtech.com/activate">link</a> to activate your account.</p>
  <p>Your token is ${token}</p>
`;

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
  // console.log(req.body);
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
  // console.log(req.body);
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
  // console.log(req.body);
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
  // console.log(req.body);
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
  // console.log(req.body);
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
  // console.log(req.body);
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

// Set default timezone for moment
moment.tz.setDefault("Asia/Kuala_Lumpur");

// Modify the cron schedule to explicitly use Malaysia timezone
cron.schedule(
  "1 0 * * *",
  () => {
    console.log(
      "Running scheduled TAT alert check...",
      moment().format("YYYY-MM-DD HH:mm:ss")
    );
    sendTatAlerts();
  },
  {
    scheduled: true,
    timezone: "Asia/Kuala_Lumpur",
  }
);

const sendTatAlerts = async (isTest = false) => {
  try {
    const now = moment(); // Will use Malaysia timezone
    console.log(`Starting TAT check at: ${now.format("YYYY-MM-DD HH:mm:ss")}`);

    const tatCharts = await TatChart.findAll();
    const getDeptWithPic = async (refTypeId) => {
      const dept = await db.dept.findOne({
        where: { id: refTypeId },
        include: [
          {
            model: db.user, // Use the base model name
            as: "staff", // Use the alias defined in the association
            through: "user_depts", // Specify the junction table
            where: { id: db.Sequelize.col("depts.picID") }, // Match user.id with dept.picID
          },
        ],
      });
      return dept;
    };
    const casefiles = await Casefile.findAll({
      where: {
        fileStatus: {
          [Op.notIn]: ["CLO", "CANC"],
        },
        adjuster: {
          [Op.ne]: null,
        },
      },
    });

    // Update date calculation to use moment timezone
    const today = now.startOf("day").toDate();

    // Modify filter to only get cases exactly one day after TAT alert
    const alertCases = casefiles.filter((casefile) => {
      const matchingTat = tatCharts.find(
        (tat) =>
          tat.insId === casefile.insurer &&
          tat.subDeptId === casefile.subRefType
      );

      if (!matchingTat) return false;

      const assignDate = moment(casefile.dateOfAssign).startOf("day");
      const daysSinceAssigned = now.diff(assignDate, "days");

      // Only send alert if it's exactly tatAlert + 1 days
      const shouldSendAlert = daysSinceAssigned === matchingTat.tatAlert + 1;

      console.log(
        `Case ${casefile.id}: Days since assigned: ${daysSinceAssigned}, TAT Alert: ${matchingTat.tatAlert}, Should Send: ${shouldSendAlert}`
      );

      return shouldSendAlert;
    });

    console.log(`Found ${alertCases.length} cases requiring TAT alerts`);

    // Limit to 2 cases if this is a test run
    const casesToProcess = isTest ? alertCases.slice(0, 2) : alertCases;

    if (isTest) {
      console.log(`Test mode: Processing only ${casesToProcess.length} cases`);
    }

    // Add delay between emails and handle promises properly
    for (const casefile of casesToProcess) {
      const Insurer = await db.inss
        .findOne({
          where: { id: casefile.insurer },
        })
        .then((ins) => ins.name);
      const DeptCode = await db.dept
        .findOne({ where: { id: casefile.refType } })
        .then((dept) => dept.name);
      const SubDeptCode = await db.subDept
        .findOne({ where: { id: casefile.subRefType } })
        .then((subdpt) => subdpt.subCode);
      const Branch = await db.branch.findOne({
        where: { id: casefile.branch },
      });

      // const departments = await db.dept.findAll({
      //   include: [
      //     {
      //       model: db.user,
      //       as: "pic",
      //       attributes: ["email"],
      //     },
      //   ],
      // });

      // Get department with PIC
      const deptWithPic = await getDeptWithPic(casefile.refType);
      const picEmail = deptWithPic?.staff?.[0]?.email;

      console.log("PIC Email:", picEmail);

      // const dept = departments.find((d) => d.id === casefile.refType);
      // const picEmail = dept?.pic?.email;

      const Adjuster = await db.user.findOne({
        where: { id: casefile.adjuster },
      });

      const output = `
         <!--  <h1>THIS IS A TEST MAIL, PLEASE IGNORE</h1> -->
        <p>Dear Adjuster,</p>
        <p>Kindly ensure that your report is submitted for editing within the next three days. Should you encounter any difficulties meeting this deadline, kindly see your manager with your physical file for further discussion and assistance.</p>
        <h3>Case Details</h3>
        <ul>
          <li>Vehicle Number: ${(
            casefile.vehicleNo || "TBA"
          ).toUpperCase()}</li>
          <li>Ref Number: AA/${DeptCode}/${SubDeptCode}/${casefile.id}/${
        Branch.brCode
      }</li>
            <li>Insurer: ${Insurer}</li>
          <li>Date Of Assigned: ${moment(casefile.dateOfAssign).format(
            "DD/MM/YYYY"
          )}</li>
          <li>Department:  ${DeptCode}</li>
          <li>Sub-Category: ${SubDeptCode}</li>
          <li>Branch: ${Branch.name}</li>
          <li>Adjuster: ${Adjuster.username}</li>
        </ul>
        <br>
        <p>Thank you</p>
      `;
      // const sendTo = Adjuster.email;

      const recipients = [Adjuster.email, "sys.admin@associatedadjusters.com"];
      if (picEmail) {
        recipients.push(picEmail);
      }

      let mailOptions = {
        from: '"System Admin" <sys.admin@associatedadjusters.com>',
        // to: sendTo + "," + "sys.admin@associatedadjusters.com",
        to: recipients.join(","),
        subject: "REPORT SUBMISSION REMINDER",
        html: output,
      };

      try {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay

        // Wrap sendMail in a promise
        const info = await new Promise((resolve, reject) => {
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log("Detailed email error:", error);
              reject(error);
            } else {
              resolve(info);
            }
          });
        });

        console.log("TAT Alert Email sent:", info.messageId);

        // Update the flag after successful email send
        await Casefile.update(
          { tatAlertSent: true },
          { where: { id: casefile.id } }
        );

        console.log(
          `TAT Alert Email sent for case ${casefile.id}:`,
          info.messageId
        );
      } catch (error) {
        console.log("TAT Alert Email Error:", {
          message: error.message,
          code: error.code,
          command: error.command,
          caseId: casefile.id,
        });
      }
    }
  } catch (error) {
    console.error("Error in TAT alert process:", {
      message: error.message,
      stack: error.stack,
    });
  }
};

// Add a function to reset TAT alert flags (for testing)
// const resetTatAlerts = async (req, res) => {
//   try {
//     await Casefile.update(
//       { tatAlertSent: false },
//       { where: { tatAlertSent: true } }
//     );
//     res.send({ message: "TAT alert flags reset successfully" });
//   } catch (error) {
//     res.status(500).send({
//       message: "Error resetting TAT alert flags",
//       error: error.message
//     });
//   }
// };

const testTatAlerts = async (req, res) => {
  console.log("Manually triggering TAT alerts (test mode)...");
  try {
    await sendTatAlerts(true); // Pass true to indicate test mode
    res.send({
      message:
        "TAT alert check triggered manually (test mode). Check console for results.",
    });
  } catch (error) {
    res.status(500).send({
      message: "Error triggering TAT alerts",
      error: error.message,
    });
  }
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
  testTatAlerts,
  sendTatAlerts,
  // resetTatAlerts
};
