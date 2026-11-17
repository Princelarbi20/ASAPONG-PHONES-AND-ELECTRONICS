# Email delivery configuration

All backend email is sent through Nodemailer using Gmail SMTP. Set these environment variables in Render's backend service:

- `EMAIL_USER`: the full Gmail address used to send mail.
- `EMAIL_PASS`: a Google App Password for that account (not the account's normal password). Google requires 2-Step Verification before an App Password can be created.
- `EMAIL_FROM` (optional): a Gmail address or configured Gmail alias accepted for that authenticated account. If omitted, `EMAIL_USER` is used.
- `EMAIL_OUTBOX_ENCRYPTION_SECRET` (recommended): a long random secret used to encrypt order notification payloads. If omitted, the existing `REFRESH_TOKEN_SECRET` fallback is used. Keep the value stable while queued notifications exist.

Do not put these values in frontend/Vercel variables. Never commit them or print them in logs. The backend's OTP and order email workers retry temporary failures and log only safe error codes and provider message IDs. Missing Gmail configuration leaves order/payment/status operations successful while the notification remains subject to retry policy.

## Gmail setup

1. Enable 2-Step Verification on the sending Google account.
2. Create an App Password for the backend and set it as `EMAIL_PASS` in Render.
3. Set `EMAIL_USER` and, if needed, `EMAIL_FROM` in Render, then redeploy.
4. Place a COD order and check Render logs for `[order-email] delivery_accepted`; test an online order and check only after Paystack verification; change an order status and confirm its notification is queued and accepted.
5. Check the recipient's inbox and spam folder. SMTP acceptance means Gmail accepted the message, not that it reached the inbox.

The persistent outbox deduplicates events in MongoDB and uses a stable RFC Message-ID for order events. Gmail SMTP does not provide an idempotency API, so absolute exactly-once delivery cannot be guaranteed if a process crashes after Gmail accepts a message but before the outbox marks it sent. The outbox retries temporary provider failures and the event key prevents duplicate enqueueing.
