const nodemailer = require("nodemailer");

const notify = (req, res) => {
  const output = `
    <p>You have a new contact request</p>
    <h3>Contact Details</h3>
    <ul>  
      <li>Name: ${req.body.name}</li>
      <li>Company: ${req.body.company}</li>
      <li>Email: ${req.body.email}</li>
      <li>Phone: ${req.body.phone}</li>
    </ul>
    <h3>Message</h3>
    <p>${req.body.message}</p>
  `;

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "mail.associatedadjusters.com",
    port: 465,
    secure: false, // true for 465, false for other ports
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
    from: '"AASBTECH System Admin" <sys.admin@associatedadjusters.com>', // sender address
    to: "RECEIVEREMAILS", // list of receivers
    subject: "A New Alert For you", // Subject line
    text: "Hello world?", // plain text body
    html: output, // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    // res.render('contact', {msg:'Email has been sent'});
  });
};

module.exports = {
  notify,
};
