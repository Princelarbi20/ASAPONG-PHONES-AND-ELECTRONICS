import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { EmailOutbox } from "../modules/emailOutbox.js";
import sendEmail from "./nodemailer.js";

// Derive a separate encryption key from the existing mail credential. The OTP is
// recoverable only by the worker and is never stored in plaintext in MongoDB.
const getKey = () => {
  const source = process.env.EMAIL_PASS || process.env.REFRESH_TOKEN_SECRET;
  if (!source) throw new Error("An email encryption secret is required.");
  return createHash("sha256").update(source).digest();
};

const encrypt = (payload) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${data.toString("base64")}`;
};

const decrypt = (value) => {
  const [iv, tag, data] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8"));
};

export const enqueueEmail = async (message, { requestId, userId, otpHash }) => EmailOutbox.create({ encryptedPayload: encrypt(message), requestId, userId, otpHash });

let workerRunning = false;
export const processEmailQueue = async () => {
  if (workerRunning || !EmailOutbox.db.readyState) return;
  workerRunning = true;
  try {
    // Recover jobs abandoned by a process restart after a 2 minute claim.
    await EmailOutbox.updateMany({ status: "sending", lockedAt: { $lt: new Date(Date.now() - 120_000) } }, { $set: { status: "pending", lockedAt: null } });
    const job = await EmailOutbox.findOneAndUpdate(
      { status: "pending", nextAttemptAt: { $lte: new Date() } },
      { $set: { status: "sending", lockedAt: new Date() }, $inc: { attempts: 1 } },
      { sort: { createdAt: 1 }, new: true }
    ).select("+encryptedPayload +otpHash");
    if (!job) return;
    const startedAt = Date.now();
    try {
      const user = await EmailOutbox.db.model("Users").findById(job.userId).select("+otp otpExpires isVerified");
      if (!user || user.isVerified || user.otp !== job.otpHash || !user.otpExpires || user.otpExpires <= new Date()) {
        await EmailOutbox.updateOne({ _id: job._id }, { $set: { status: "failed", lastError: "OTP was replaced, expired, or account was verified.", lockedAt: null }, $unset: { encryptedPayload: 1, otpHash: 1 } });
        return;
      }
      await sendEmail(decrypt(job.encryptedPayload));
      await EmailOutbox.updateOne({ _id: job._id }, { $set: { status: "sent", sentAt: new Date(), lockedAt: null }, $unset: { encryptedPayload: 1, otpHash: 1, lastError: 1 } });
      console.info(JSON.stringify({ event: "email_delivery", requestId: job.requestId || undefined, status: "sent", durationMs: Date.now() - startedAt }));
    } catch (error) {
      const terminal = job.attempts >= 5;
      const delayMs = Math.min(60_000 * (2 ** (job.attempts - 1)), 15 * 60_000);
      await EmailOutbox.updateOne({ _id: job._id }, { $set: { status: terminal ? "failed" : "pending", lockedAt: null, nextAttemptAt: new Date(Date.now() + delayMs), lastError: String(error.message || "Email delivery failed").slice(0, 300) } });
      console.error(JSON.stringify({ event: "email_delivery", status: terminal ? "failed" : "retry_scheduled", attempt: job.attempts, durationMs: Date.now() - startedAt }));
    }
  } catch (error) {
    console.error(JSON.stringify({ event: "email_queue_error", errorName: error.name, errorCode: error.code }));
  } finally {
    workerRunning = false;
  }
};

export const startEmailQueue = () => {
  const timer = setInterval(processEmailQueue, 2_000);
  timer.unref?.();
  processEmailQueue();
};
