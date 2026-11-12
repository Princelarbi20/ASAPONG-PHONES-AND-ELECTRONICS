import nodemailer from 'nodemailer';

// Nodemailer may resolve sendMail() when a message was accepted by the SMTP
// server even if a particular recipient was rejected. Treat only acceptance
// of the intended recipient as delivery success so callers can invalidate an
// OTP when the mail provider did not accept it.
export const wasRecipientAccepted = (info, recipient) => {
  const normalize = (value) => String(value || '').trim().toLowerCase();
  const expected = normalize(recipient);
  if (!expected || !Array.isArray(info?.accepted)) return false;
  return info.accepted.some((address) => normalize(address) === expected)
    && !(Array.isArray(info.rejected) && info.rejected.some((address) => normalize(address) === expected));
};

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
    console.info('[email-sink] email suppressed by test configuration');
    return { success: true, messageId: 'test-email-sink' };
  }

  const authUser = process.env.EMAIL_USER?.trim() || '';
  // Gmail displays app passwords in four-character groups. Those spaces are
  // presentation formatting and must be removed before SMTP authentication.
  const authPass = process.env.EMAIL_PASS?.replace(/\s/g, '') || '';
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

    if (!wasRecipientAccepted(info, to)) {
      const error = new Error('SMTP server did not accept the configured recipient.');
      console.error('Email delivery was not accepted by SMTP:', JSON.stringify({
        code: info?.responseCode,
        acceptedCount: Array.isArray(info?.accepted) ? info.accepted.length : 0,
        rejectedCount: Array.isArray(info?.rejected) ? info.rejected.length : 0,
      }));
      return { success: false, error };
    }

    console.info('Email accepted by SMTP provider.');
    return { success: true, messageId: info.messageId };
  } catch (error) {
    // Keep operational diagnostics useful without logging message contents,
    // recipient addresses, credentials, or OTPs.
    console.error('Failed to send email:', JSON.stringify({
      code: error?.code,
      responseCode: error?.responseCode,
      command: error?.command,
      message: error?.message,
    }));
    return { success: false, error };
  }
};

export default sendEmail;
