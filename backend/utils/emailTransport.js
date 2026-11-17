import nodemailer from 'nodemailer';

const validRecipient = (recipient) => {
  const recipients = Array.isArray(recipient) ? recipient : [recipient];
  return recipients.length > 0 && recipients.every((value) =>
    typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
};

export const createEmailSender = ({ transportFactory = nodemailer.createTransport, env = process.env, logger = console } = {}) => {
  let transport;
  let transportKey;

  return async (arg1, toParam, subjectParam, htmlParam) => {
    const message = typeof arg1 === 'object' && arg1 !== null
      ? arg1
      : { to: toParam, subject: subjectParam, html: htmlParam };

    if (env.NODE_ENV === 'test' || String(env.EMAIL_SINK || '').toLowerCase() === 'true') {
      logger.info('[email-sink] email suppressed by test configuration');
      return { success: true, messageId: 'test-email-sink' };
    }

    const user = env.EMAIL_USER?.trim();
    const pass = env.EMAIL_PASS?.trim();
    if (!user || !pass) {
      const code = !user ? 'email_user_missing' : 'email_pass_missing';
      logger.error('[email] configuration_missing', JSON.stringify({ code }));
      return { success: false, error: { code } };
    }
    if (!validRecipient(message.to) || !String(message.subject || '').trim() || (!message.html && !message.text)) {
      const code = !validRecipient(message.to) ? 'invalid_recipient' : 'invalid_message';
      logger.error('[email] request_invalid', JSON.stringify({ code }));
      return { success: false, error: { code } };
    }

    try {
      const key = `${user}\0${pass}`;
      if (!transport || transportKey !== key) {
        transport = transportFactory({
          service: 'gmail',
          auth: { user, pass },
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
        });
        transportKey = key;
      }
      const info = await transport.sendMail({
        from: env.EMAIL_FROM?.trim() || user,
        to: Array.isArray(message.to) ? message.to.map((value) => value.trim()) : message.to.trim(),
        subject: String(message.subject).trim(),
        ...(message.text ? { text: message.text } : {}),
        ...(message.html ? { html: message.html } : {}),
        ...(message.headers ? { headers: message.headers } : {}),
      });
      const expected = (Array.isArray(message.to) ? message.to : [message.to]).map((value) => value.trim().toLowerCase());
      const accepted = (info?.accepted || []).map((value) => String(value).toLowerCase());
      if (!expected.every((recipient) => accepted.includes(recipient))) {
        logger.error('[email] recipient_not_accepted', JSON.stringify({ code: 'recipient_not_accepted' }));
        return { success: false, error: { code: 'recipient_not_accepted' } };
      }
      const messageId = String(info.messageId || 'accepted');
      logger.info('[email] gmail_accepted', JSON.stringify({ messageId }));
      return { success: true, messageId };
    } catch (error) {
      const safeError = {
        code: String(error?.code || error?.name || 'gmail_send_failed').slice(0, 100),
        ...(Number.isInteger(error?.responseCode) ? { statusCode: error.responseCode } : {}),
      };
      logger.error('[email] gmail_rejected', JSON.stringify(safeError));
      return { success: false, error: safeError };
    }
  };
};

const sendEmail = createEmailSender();
export default sendEmail;
