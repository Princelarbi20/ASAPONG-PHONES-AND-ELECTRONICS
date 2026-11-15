import nodemailer from 'nodemailer';

let transporter;
const getTransporter = () => {
  if (!transporter) {
    const authUser = process.env.EMAIL_USER?.trim();
    const authPass = process.env.EMAIL_PASS?.trim();
    if (!authUser || !authPass) throw new Error('Email provider credentials are not configured.');
    transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: { user: authUser, pass: authPass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      pool: true,
      maxConnections: 2,
      maxMessages: 100,
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html }) => {
  if (!to || !subject || !html) throw new Error('Email recipient, subject, and content are required.');
  const authUser = process.env.EMAIL_USER.trim();
  return getTransporter().sendMail({ from: authUser, to: to.trim(), subject, html });
};

export default sendEmail;
