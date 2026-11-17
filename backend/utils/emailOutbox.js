
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

import { EmailOutbox } from '../modules/emailOutbox.js';
import { Register } from '../modules/userRegister.js';
import { PasswordResetOTP } from '../modules/passwordResetOTP.js';
import sendEmail from './emailTransport.js';

const MAX_ATTEMPTS = 5;

const retryDelayMs = [
  15_000,
  30_000,
  60_000,
  120_000,
  300_000,
];

let processing = false;

// Generate an encryption key for queued email payloads.
const encryptionKey = () => {
  const secret = process.env.REFRESH_TOKEN_SECRET;

  if (!secret) {
    throw new Error(
      'REFRESH_TOKEN_SECRET must be set to protect queued email payloads.'
    );
  }

  return createHmac('sha256', secret)
    .update('asapong-otp-outbox-v1')
    .digest();
};

// Encrypt email payload using AES-256-GCM.
const encryptPayload = (payload) => {
  const iv = randomBytes(12);

  const cipher = createCipheriv(
    'aes-256-gcm',
    encryptionKey(),
    iv
  );

  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);

  return `${iv.toString('base64')}.${cipher
    .getAuthTag()
    .toString('base64')}.${ciphertext.toString('base64')}`;
};

// Decrypt queued email payload.
const decryptPayload = (encrypted) => {
  const [iv, tag, ciphertext] = encrypted.split('.');

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8'));
};

// Add an OTP email to the delivery queue.
export const enqueueOtpEmail = async ({
  requestId,
  userId,
  otpVersion,
  message,
}) => {
  return EmailOutbox.create({
    requestId,
    userId,
    otpVersion,
    encryptedPayload: encryptPayload(message),
  });
};

export const enqueuePasswordResetEmail = async ({ requestId, userId, otpHash, message }) => {
  return EmailOutbox.create({
    requestId,
    kind: 'password_reset',
    priority: 10,
    userId,
    otpVersion: otpHash,
    encryptedPayload: encryptPayload(message),
  });
};

// Process pending OTP emails.
export const processEmailOutbox = async ({ send = sendEmail } = {}) => {
  if (processing) return;

  processing = true;

  try {
    // Release jobs with expired processing locks.
    const staleLock = new Date(Date.now() - 120_000);

    await EmailOutbox.updateMany(
      {
        status: 'sending',
        lockedAt: { $lt: staleLock },
      },
      {
        $set: {
          status: 'pending',
          lockedAt: null,
        },
      }
    );

    // Atomically claim the oldest pending email.
    const job = await EmailOutbox.findOneAndUpdate(
      {
        status: 'pending',
        attempts: { $lt: MAX_ATTEMPTS },
        nextAttemptAt: { $lte: new Date() },
      },
      {
        $set: {
          status: 'sending',
          lockedAt: new Date(),
        },
        $inc: {
          attempts: 1,
        },
      },
      {
        returnDocument: 'after',
        sort: { priority: -1, createdAt: 1 },
      }
    ).select('+encryptedPayload');

    if (!job) return;

    // Confirm that the OTP is still valid before sending.
    const user = await Register.findById(job.userId)
      .select('+otpVersion');

    let isCurrentRequest = Boolean(user && !user.isSuspended);
    if (job.kind === 'password_reset') {
      isCurrentRequest = Boolean(isCurrentRequest && user.isVerified);
    } else {
      isCurrentRequest = Boolean(isCurrentRequest && !user.isVerified);
    }
    if (isCurrentRequest && job.kind === 'password_reset') {
      const resetRecord = await PasswordResetOTP.findOne({ userId: job.userId }).select('+otpHash');
      isCurrentRequest = Boolean(
        resetRecord?.otpHash === job.otpVersion &&
        resetRecord.otpExpiresAt && resetRecord.otpExpiresAt > new Date()
      );
    } else if (isCurrentRequest) {
      isCurrentRequest = Boolean(user.otpVersion === job.otpVersion && user.otpExpires && user.otpExpires > new Date());
    }

    if (!isCurrentRequest) {
      await EmailOutbox.updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'failed',
            lastErrorCode: 'stale_or_expired_otp',
            lockedAt: null,
          },
          $unset: {
            encryptedPayload: 1,
          },
        }
      );

      return;
    }

    // Attempt email delivery.
    const deliveryStartedAt = Date.now();

    const message = decryptPayload(job.encryptedPayload);
    const stableMessageId = `<${Buffer.from(String(job.requestId || job._id)).toString('hex')}@asapong-phones.local>`;
    const result = await send({
      ...message,
      headers: { ...(message.headers || {}), 'Message-ID': stableMessageId },
    });

    // Handle unsuccessful delivery.
    if (!result?.success) {
      const attempts = job.attempts;
      const terminal = attempts >= MAX_ATTEMPTS;

      const failureUpdate = {
        $set: {
          status: terminal ? 'failed' : 'pending',
          lockedAt: null,
          lastErrorCode:
            result?.error?.code || 'delivery_not_accepted',
          nextAttemptAt: new Date(
            Date.now() +
              retryDelayMs[
                Math.min(
                  attempts - 1,
                  retryDelayMs.length - 1
                )
              ]
          ),
        },
      };

      if (terminal) {
        failureUpdate.$unset = {
          encryptedPayload: 1,
        };
      }

      await EmailOutbox.updateOne(
        { _id: job._id },
        failureUpdate
      );

      console.error(
        '[email-outbox] delivery_failed',
        JSON.stringify({
          requestId: job.requestId,
          attempt: attempts,
          terminal,
          durationMs: Date.now() - deliveryStartedAt,
          errorCode: result?.error?.code || null,
        })
      );

      return;
    }

    // Mark successful email delivery.
    await EmailOutbox.updateOne(
      { _id: job._id },
      {
        $set: {
          status: 'sent',
          sentAt: new Date(),
          lockedAt: null,
        },
        $unset: {
          encryptedPayload: 1,
          lastErrorCode: 1,
        },
      }
    );

    console.info(
      '[email-outbox] delivery_accepted',
      JSON.stringify({
        requestId: job.requestId,
        durationMs: Date.now() - deliveryStartedAt,
      })
    );

  } catch (error) {
    console.error(
      '[email-outbox] worker_error',
      JSON.stringify({
        errorName: error?.name,
        errorCode: error?.code,
      })
    );

  } finally {
    processing = false;
  }
};

// Start the email outbox background worker.
export const startEmailOutboxWorker = () => {
  const timer = setInterval(
    processEmailOutbox,
    2_000
  );

  timer.unref?.();

  void processEmailOutbox();
};

export const wakeEmailOutboxWorker = () => {
  void processEmailOutbox();
};
