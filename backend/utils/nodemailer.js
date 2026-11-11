import nodemailer from 'nodemailer';

const sendEmail = async (arg1, toParam, subjectParam, htmlParam) => {
  let to;
  let subject;
  let html;
  let text;

  if (typeof arg1 === 'object' && arg1 !== null) {
    ({ to, subject, html, text } = arg1);
  } else {
    to = toParam;
    subject = subjectParam;
    html = htmlParam;
  }

  if (process.env.NODE_ENV === 'test' || process.env.EMAIL_SINK === 'true') {
    console.info(`[email-sink] suppressed email to ${String(to || '').replace(/[^@.a-zA-Z0-9_-]/g, '')} (${subject || 'no subject'})`);
    return { success: true, messageId: 'test-email-sink' };
  }

  const authUser = process.env.EMAIL_USER?.trim() || '';
  const authPass = process.env.EMAIL_PASS?.trim() || '';
  if (!to || !authUser || !authPass) {
    const error = new Error(!to
      ? "Email recipient 'to' address is missing."
      : 'Email service is not configured. Set EMAIL_USER and EMAIL_PASS.');
    console.error('Failed to send email:', error.message);
    return { success: false, error };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: { user: authUser, pass: authPass },
    });

    const info = await transporter.sendMail({
      from: authUser,
      to: to.trim(),
      subject,
      text,
      html,
    });

    console.log(`Email successfully sent to: ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
};

export default sendEmail;
