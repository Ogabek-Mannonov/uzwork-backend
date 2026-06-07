const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // VAQTINCHALIK O'CHIRILDI (SMTP Timeout xatoligi sabab)
  // Email o'rniga console.log da chiqariladi:
  console.log("Mock sendEmail called for:", options.to);
  return true;

  /*
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 465,
    secure: true, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || "Lewai Platform"}" <${
      process.env.SMTP_FROM || process.env.SMTP_USER
    }>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
  */
};

module.exports = sendEmail;
