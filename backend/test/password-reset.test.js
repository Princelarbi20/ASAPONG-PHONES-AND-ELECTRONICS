import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Register } from '../modules/userRegister.js';
import { PasswordResetOTP } from '../modules/passwordResetOTP.js';
import { AuthAuditLog } from '../modules/authAuditLog.js';
import { EmailOutbox } from '../modules/emailOutbox.js';
import { enqueuePasswordResetEmail, processEmailOutbox } from '../utils/emailOutbox.js';
import { forgotPasswordController } from '../controllers/authController/forgotPasswordController.js';
import { resendResetOtpController } from '../controllers/authController/resendResetOtpController.js';
import { verifyResetOtpController } from '../controllers/authController/verifyResetOtpController.js';
import { completeForgotPasswordResetController } from '../controllers/authController/resetPasswordController.js';
import { createEmailSender } from '../utils/emailTransport.js';
import { userLoginController } from '../controllers/authController/userloginController.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { createResetFlowId, hashResetSecret, RESET_FLOW_TTL_MS, verifyResetFlowId } from '../utils/passwordReset.js';
import { verifyPassword } from '../utils/passwordHash.js';

const originalEnv = process.env.NODE_ENV;
const originalResetFlowSecret = process.env.RESET_FLOW_SECRET;
const originalRefreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
process.env.RESET_FLOW_SECRET = 'isolated-password-reset-flow-test-secret';
process.env.REFRESH_TOKEN_SECRET = 'isolated-email-outbox-secret-at-least-32-chars';
const validId = '64b000000000000000000001';
const stub = (t, object, key, implementation) => {
  const originalMethod = object[key];
  object[key] = implementation;
  t.after(() => { object[key] = originalMethod; });
};
const response = () => ({
  statusCode: 200, body: null, clearedCookies: [],
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  cookie(name, value, options) { this.cookies ??= []; this.cookies.push({ name, value, options }); return this; },
  clearCookie(name, options) { this.clearedCookies.push({ name, options }); return this; },
});
const userWithPassword = async () => ({
  _id: validId, email: 'person@example.com', userName: 'Test Person', isVerified: true, isSuspended: false,
  role: 'USER', tokenVersion: 2, password: await bcrypt.hash('OldPassword1!', 4), save: async function save() {},
});

test('Gmail SMTP adapter reports accepted and rejected recipients safely', async () => {
  const calls = [];
  const sender = createEmailSender({ transportFactory: (options) => { calls.push(options); return { sendMail: async (message) => { calls.push(message); return { messageId: 'gmail-test', accepted: ['person@example.com'] }; } }; }, env: { EMAIL_USER: 'store@gmail.com', EMAIL_PASS: 'test-app-password' }, logger: { info() {}, error() {} } });
  const result = await sender({ to: 'person@example.com', subject: 'Test', text: 'Message', idempotencyKey: 'event-1' });
  assert.equal(result.success, true);
  assert.equal(result.messageId, 'gmail-test');
  assert.equal(calls[0].service, 'gmail');
  assert.equal(calls[0].connectionTimeout, 10_000);
  assert.equal(calls[0].greetingTimeout, 10_000);
  assert.equal(calls[0].socketTimeout, 15_000);
  assert.equal(calls[0].auth.user, 'store@gmail.com');
  assert.equal(calls[1].to, 'person@example.com');
  assert.equal(calls[1].from, 'store@gmail.com');
});

test('Gmail SMTP failures return safe errors and never log credentials or message content', async () => {
  const logged = [];
  const sender = createEmailSender({
    transportFactory: () => ({ sendMail: async () => { throw Object.assign(new Error('app-password-and-reset-token'), { code: 'EAUTH' }); } }),
    env: { EMAIL_USER: 'store@gmail.com', EMAIL_PASS: 'private-app-password' },
    logger: { info() {}, error: (...args) => logged.push(args.join(' ')) },
  });
  const result = await sender({ to: 'person@example.com', subject: 'Reset', text: 'secret-code-123456' });
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'EAUTH');
  assert.ok(!logged.join(' ').includes('private-app-password'));
  assert.ok(!logged.join(' ').includes('secret-code-123456'));
});

test('forgot password returns a generic response and persists only a hashed OTP', async (t) => {
  process.env.NODE_ENV = 'test';
  const user = await userWithPassword();
  let savedUpdate;
  let queuedEmail;
  stub(t, Register, 'findOne', async (filter) => {
    assert.deepEqual(filter, { email: user.email, isVerified: true, isSuspended: false });
    return user;
  });
  stub(t, PasswordResetOTP, 'findOne', () => ({ select: async () => null }));
  stub(t, PasswordResetOTP, 'findOneAndUpdate', async (_filter, update) => { savedUpdate = update; return {}; });
  stub(t, EmailOutbox, 'create', async (record) => { queuedEmail = record; return record; });
  const res = response();
  await forgotPasswordController({ body: { email: user.email } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /If an account is eligible/);
  assert.equal(verifyResetFlowId(res.body.flowId, user.email), true);
  assert.ok(new Date(res.body.flowExpiresAt).getTime() - Date.now() <= RESET_FLOW_TTL_MS);
  assert.match(savedUpdate.$set.otpHash, /^\$2[aby]\$/);
  assert.equal(savedUpdate.$set.flowIdHash, hashResetSecret(res.body.flowId));
  assert.notEqual(savedUpdate.$set.flowIdHash, res.body.flowId);
  assert.equal(savedUpdate.$set.flowIdExpiresAt.getTime(), new Date(res.body.flowExpiresAt).getTime());
  assert.equal(savedUpdate.$set.otpHash.length, 60);
  assert.equal(savedUpdate.$set.otpExpiresAt.getTime() - Date.now() <= 5 * 60 * 1000, true);
  assert.equal(savedUpdate.$set.authorizationHash, null);
  assert.equal(queuedEmail.kind, 'password_reset');
  assert.equal(queuedEmail.otpVersion, savedUpdate.$set.otpHash);
  assert.equal(queuedEmail.to, undefined, 'reset email address and OTP message are encrypted in the outbox');
});

test('reset email template includes a direct verification route and escapes untrusted content', async () => {
  const { getPasswordResetOtpEmail } = await import('../utils/passwordReset.js');
  const html = getPasswordResetOtpEmail({ userName: '<script>x</script>', otp: '123456', expiresMinutes: 5, verificationUrl: 'https://shop.example/auth/verify-reset-otp#flowId=opaque' });
  assert.ok(!html.includes('<script>x</script>'));
  assert.ok(html.includes('https://shop.example/auth/verify-reset-otp#flowId=opaque'));
  assert.ok(html.includes('Open verification page'));
});

test('reset outbox delivers through the worker only while its hashed OTP remains current', async (t) => {
  const user = { _id: validId, isVerified: true, isSuspended: false };
  const otpHash = 'bcrypt-reset-hash';
  const resetRecord = { otpHash, otpExpiresAt: new Date(Date.now() + 60_000) };
  let job;
  let delivered;
  stub(t, EmailOutbox, 'create', async (record) => {
    job = { ...record, _id: 'reset-email-job', attempts: 1, status: 'sending' };
    return job;
  });
  stub(t, EmailOutbox, 'updateMany', async () => ({ modifiedCount: 0 }));
  stub(t, EmailOutbox, 'findOneAndUpdate', () => ({ select: async () => job }));
  stub(t, EmailOutbox, 'updateOne', async (_filter, update) => { Object.assign(job, update.$set); return { modifiedCount: 1 }; });
  stub(t, Register, 'findById', () => ({ select: async () => user }));
  stub(t, PasswordResetOTP, 'findOne', () => ({ select: async () => resetRecord }));
  await enqueuePasswordResetEmail({
    requestId: 'reset-request-test', userId: validId, otpHash,
    message: { to: user.email || 'person@example.com', subject: 'Reset code', text: 'Code 123456' },
  });
  await processEmailOutbox({ send: async (message) => { delivered = message; return { success: true, messageId: 'smtp-accepted' }; } });
  assert.equal(job.status, 'sent');
  assert.equal(delivered.subject, 'Reset code');
  assert.match(delivered.headers['Message-ID'], /asapong-phones\.local/);
});

test('unknown email receives the same generic forgot password response', async (t) => {
  process.env.NODE_ENV = 'test';
  stub(t, Register, 'findOne', async () => null);
  const res = response();
  await forgotPasswordController({ body: { email: 'missing@example.com' } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /If an account is eligible/);
  assert.equal(verifyResetFlowId(res.body.flowId, 'missing@example.com'), true);
  assert.equal(verifyResetFlowId(res.body.flowId, 'another@example.com'), false);
});

test('reset flow identifiers expire and cannot be reused for another email', () => {
  const issuedAt = Date.now();
  const flowId = createResetFlowId(' PERSON@example.com ', issuedAt);
  assert.equal(verifyResetFlowId(flowId, 'person@example.com', issuedAt + RESET_FLOW_TTL_MS), true);
  assert.equal(verifyResetFlowId(flowId, 'person@example.com', issuedAt + RESET_FLOW_TTL_MS + 1), false);
  assert.equal(verifyResetFlowId(flowId, 'other@example.com', issuedAt + 1), false);
  assert.equal(verifyResetFlowId(`${flowId}x`, 'person@example.com', issuedAt + 1), false);
});

test('OTP verification rejects a flow identifier issued for a different email', async (t) => {
  process.env.NODE_ENV = 'test';
  const flowId = createResetFlowId('someone-else@example.com');
  stub(t, Register, 'findOne', () => assert.fail('mismatched flow id must be rejected before account lookup'));
  const res = response();
  await verifyResetOtpController({ body: { email: 'person@example.com', flowId, otp: '123456' } }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /invalid or expired/i);
});

test('OTP verification rejects a valid flow ID that is not associated with the OTP record', async (t) => {
  process.env.NODE_ENV = 'test';
  const user = await userWithPassword();
  const flowId = createResetFlowId(user.email);
  const record = {
    _id: 'reset-record',
    otpHash: await bcrypt.hash('123456', 4),
    flowIdHash: hashResetSecret(createResetFlowId(user.email)),
    flowIdExpiresAt: new Date(Date.now() + RESET_FLOW_TTL_MS),
    otpExpiresAt: new Date(Date.now() + 60_000),
    otpAttempts: 0,
  };
  stub(t, Register, 'findOne', async () => user);
  stub(t, PasswordResetOTP, 'findOne', () => ({ select: async () => record }));
  stub(t, PasswordResetOTP, 'findOneAndUpdate', () => assert.fail('unassociated flow ID must not consume OTP'));
  const res = response();
  await verifyResetOtpController({ body: { email: user.email, flowId, otp: '123456' } }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /invalid or expired/i);
});

test('unverified and suspended accounts receive only the generic flow response', async (t) => {
  process.env.NODE_ENV = 'test';
  let queryCount = 0;
  stub(t, Register, 'findOne', async (filter) => {
    queryCount += 1;
    assert.equal(filter.isVerified, true);
    assert.equal(filter.isSuspended, false);
    return null;
  });
  stub(t, PasswordResetOTP, 'findOne', () => assert.fail('ineligible account must not get an OTP record'));
  for (const email of ['unverified@example.com', 'suspended@example.com']) {
    const res = response();
    await forgotPasswordController({ body: { email } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body.message, /If an account is eligible/);
    assert.equal(verifyResetFlowId(res.body.flowId, email), true);
  }
  assert.equal(queryCount, 2);
});

test('invalid and empty email values do not create a flow or access OTP records', async (t) => {
  process.env.NODE_ENV = 'test';
  stub(t, Register, 'findOne', () => assert.fail('invalid email must not query accounts'));
  stub(t, PasswordResetOTP, 'findOne', () => assert.fail('invalid email must not access reset records'));
  for (const email of ['', 'not-an-email']) {
    const res = response();
    await forgotPasswordController({ body: { email } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.flowId, undefined);
  }
  const emptyRes = response();
  await forgotPasswordController({ body: {} }, emptyRes);
  assert.equal(emptyRes.statusCode, 200);
  assert.equal(emptyRes.body.flowId, undefined);
});

test('repeated requests over the account limit remain generic and do not issue another OTP', async (t) => {
  process.env.NODE_ENV = 'test';
  const user = await userWithPassword();
  const record = { requestWindowStartedAt: new Date(), requestCount: 4 };
  stub(t, Register, 'findOne', async () => user);
  stub(t, PasswordResetOTP, 'findOne', () => ({ select: async () => record }));
  stub(t, PasswordResetOTP, 'findOneAndUpdate', () => assert.fail('rate-limited request must not replace the OTP'));
  stub(t, PasswordResetOTP, 'updateOne', async (_filter, update) => {
    assert.ok(update.$set.flowIdHash);
    assert.ok(update.$set.flowIdExpiresAt instanceof Date);
    return { modifiedCount: 1 };
  });
  const res = response();
  await forgotPasswordController({ body: { email: user.email } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /If an account is eligible/);
  assert.equal(verifyResetFlowId(res.body.flowId, user.email), true);
});

test('reset queue failure clears only the matching OTP and keeps the generic response', async (t) => {
  const previousEnv = process.env.NODE_ENV;
  const previousEmailUser = process.env.EMAIL_USER;
  const previousEmailPass = process.env.EMAIL_PASS;
  t.after(() => {
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
    if (previousEmailUser === undefined) delete process.env.EMAIL_USER;
    else process.env.EMAIL_USER = previousEmailUser;
    if (previousEmailPass === undefined) delete process.env.EMAIL_PASS;
    else process.env.EMAIL_PASS = previousEmailPass;
  });
  process.env.NODE_ENV = 'development';
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  const user = await userWithPassword();
  let storedOtpHash;
  let clearedOtp = false;
  stub(t, Register, 'findOne', async () => user);
  stub(t, PasswordResetOTP, 'findOne', () => ({ select: async () => null }));
  stub(t, PasswordResetOTP, 'findOneAndUpdate', async (_filter, update) => {
    storedOtpHash = update.$set.otpHash;
    return {};
  });
  stub(t, PasswordResetOTP, 'updateOne', async (filter, update) => {
    assert.equal(filter.otpHash, storedOtpHash);
    clearedOtp = update.$set.otpHash === null && update.$set.otpExpiresAt === null && update.$set.flowIdHash === null && update.$set.flowIdExpiresAt === null;
    return { modifiedCount: 1 };
  });
  stub(t, EmailOutbox, 'create', async () => { throw Object.assign(new Error('queue write failed'), { code: 'EQUEUE' }); });
  const res = response();
  await forgotPasswordController({ body: { email: user.email } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /If an account is eligible/);
  assert.equal(verifyResetFlowId(res.body.flowId, user.email), true);
  assert.equal(clearedOtp, true);
});

test('resending replaces the old hashed OTP and resets attempts and expiry', async (t) => {
  process.env.NODE_ENV = 'test';
  const user = await userWithPassword();
  const flowId = createResetFlowId(user.email);
  const record = {
    _id: 'reset-record', userId: validId, otpHash: await bcrypt.hash('123456', 4),
    flowIdHash: hashResetSecret(flowId), flowIdExpiresAt: new Date(Date.now() + RESET_FLOW_TTL_MS),
    otpExpiresAt: new Date(Date.now() + 60_000), otpAttempts: 4,
    authorizationHash: 'old-authorization-hash', authorizationExpiresAt: new Date(Date.now() + 60_000),
    requestCount: 1, requestWindowStartedAt: new Date(),
  };
  let savedUpdate;
  let queuedEmail;
  stub(t, Register, 'findOne', async () => user);
  stub(t, PasswordResetOTP, 'findOne', () => ({ select: async () => record }));
  stub(t, PasswordResetOTP, 'findOneAndUpdate', async (_filter, update) => {
    savedUpdate = update;
    return { ...record, ...update.$set };
  });
  stub(t, EmailOutbox, 'create', async (outboxRecord) => { queuedEmail = outboxRecord; return outboxRecord; });
  const res = response();
  await resendResetOtpController({ body: { email: user.email, flowId } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(savedUpdate.$set.otpHash, /^\$2[aby]\$/);
  assert.notEqual(savedUpdate.$set.otpHash, record.otpHash);
  assert.equal(savedUpdate.$set.otpAttempts, 0);
  assert.equal(savedUpdate.$set.authorizationHash, null);
  assert.equal(savedUpdate.$set.authorizationExpiresAt, null);
  assert.equal(savedUpdate.$set.otpExpiresAt.getTime() - Date.now() <= 5 * 60 * 1000, true);
  assert.equal(queuedEmail.kind, 'password_reset');
  assert.equal(queuedEmail.otpVersion, savedUpdate.$set.otpHash);
});

test('correct OTP creates a single-use authorization and resets password and token version', async (t) => {
  process.env.NODE_ENV = 'test';
  process.env.ACCESS_TOKEN_SECRET = 'isolated-test-access-secret-at-least-32-chars';
  process.env.REFRESH_TOKEN_SECRET = 'isolated-test-refresh-secret-at-least-32-chars';
  process.env.ACCESS_TOKEN_EXPIRE = '15m';
  process.env.REFRESH_TOKEN_EXPIRE = '1h';
  const user = await userWithPassword();
  const flowId = createResetFlowId(user.email);
  let storedRecord = {
    _id: 'reset-record', userId: validId, otpHash: await bcrypt.hash('123456', 4), otpExpiresAt: new Date(Date.now() + 60_000),
    flowIdHash: hashResetSecret(flowId), flowIdExpiresAt: new Date(Date.now() + RESET_FLOW_TTL_MS),
    otpAttempts: 0, authorizationHash: null, authorizationExpiresAt: null,
  };
  stub(t, Register, 'findOne', (filter) => ({ select: async () => filter.email === user.email ? user : null }));
  stub(t, Register, 'findOneAndUpdate', async (_filter, pipeline) => {
    const set = pipeline[0].$set;
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    user.lockUntil = user.failedLoginAttempts >= 7 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    return { failedLoginAttempts: user.failedLoginAttempts, lockUntil: user.lockUntil };
  });
  stub(t, PasswordResetOTP, 'findOne', () => ({ select: async () => storedRecord }));
  stub(t, PasswordResetOTP, 'findOneAndUpdate', async (filter, update) => {
    const set = update.$set;
    if (filter.authorizationHash) {
      if (storedRecord.authorizationHash !== filter.authorizationHash || storedRecord.authorizationExpiresAt <= filter.authorizationExpiresAt.$gt) return null;
      storedRecord = { ...storedRecord, ...set };
      return storedRecord;
    }
    if (storedRecord.otpHash !== filter.otpHash || storedRecord.otpExpiresAt <= filter.otpExpiresAt.$gt) return null;
    storedRecord = { ...storedRecord, ...set };
    return storedRecord;
  });
  stub(t, PasswordResetOTP, 'deleteOne', async () => ({ deletedCount: 1 }));
  let persistedPassword = user.password;
  user.save = async () => { persistedPassword = user.password; };
  stub(t, AuthAuditLog, 'create', async (event) => event);
  const verifyResponse = response();
  await verifyResetOtpController({ body: { email: user.email, flowId, otp: '123456' } }, verifyResponse);
  assert.equal(verifyResponse.statusCode, 200);
  assert.equal(storedRecord.otpHash, null);
  assert.ok(storedRecord.authorizationHash);
  assert.notEqual(storedRecord.authorizationHash, verifyResponse.body.resetAuthorization);

  const reusedOtpResponse = response();
  await verifyResetOtpController({ body: { email: user.email, flowId, otp: '123456' } }, reusedOtpResponse);
  assert.equal(reusedOtpResponse.statusCode, 400);

  const resetResponse = response();
  await completeForgotPasswordResetController({ body: { email: user.email, resetAuthorization: verifyResponse.body.resetAuthorization, newPassword: 'NewPassword2!' } }, resetResponse);
  assert.equal(resetResponse.statusCode, 200);
  assert.equal(user.tokenVersion, 3);
  assert.deepEqual(resetResponse.clearedCookies.map(({ name }) => name), ['accessToken', 'refreshToken']);
  assert.equal(await verifyPassword('NewPassword2!', persistedPassword), true);

  stub(t, Register, 'updateOne', async () => ({ modifiedCount: 1 }));
  const oldLogin = response();
  await userLoginController({ body: { email: user.email, password: 'OldPassword1!' } }, oldLogin);
  assert.equal(oldLogin.statusCode, 401);
  user.password = persistedPassword;
  const newLogin = response();
  await userLoginController({ body: { email: user.email, password: 'NewPassword2!' } }, newLogin);
  assert.equal(newLogin.statusCode, 200);
  assert.equal(jwt.verify(newLogin.cookies[0].value, process.env.ACCESS_TOKEN_SECRET).ver, 3);

  stub(t, Register, 'findById', async () => user);
  const staleAccess = jwt.sign({ id: validId, role: 'USER', accountType: 'USER', ver: 2 }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  const staleRefresh = jwt.sign({ id: validId, role: 'USER', accountType: 'USER', ver: 2 }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '1h' });
  const staleResponse = response();
  await verifyToken({ headers: {}, cookies: { accessToken: staleAccess } }, staleResponse, () => assert.fail('old access token must be rejected'));
  assert.equal(staleResponse.statusCode, 401);
  const staleRefreshResponse = response();
  await verifyToken({ headers: {}, cookies: { refreshToken: staleRefresh } }, staleRefreshResponse, () => assert.fail('old refresh token must be rejected'));
  assert.equal(staleRefreshResponse.statusCode, 401);

  const reusedResponse = response();
  await completeForgotPasswordResetController({ body: { email: user.email, resetAuthorization: verifyResponse.body.resetAuthorization, newPassword: 'AnotherPassword3!' } }, reusedResponse);
  assert.equal(reusedResponse.statusCode, 400);
});

test('five incorrect OTP attempts block further verification', async (t) => {
  process.env.NODE_ENV = 'test';
  const user = await userWithPassword();
  const flowId = createResetFlowId(user.email);
  const record = { _id: 'reset-record', otpHash: await bcrypt.hash('123456', 4), flowIdHash: hashResetSecret(flowId), flowIdExpiresAt: new Date(Date.now() + RESET_FLOW_TTL_MS), otpExpiresAt: new Date(Date.now() + 60_000), otpAttempts: 4 };
  let attempts = 4;
  stub(t, Register, 'findOne', async () => user);
  stub(t, PasswordResetOTP, 'findOne', () => ({ select: async () => ({ ...record, otpAttempts: attempts }) }));
  stub(t, PasswordResetOTP, 'updateOne', async () => { attempts += 1; return { modifiedCount: 1 }; });
  const fifth = response();
  await verifyResetOtpController({ body: { email: user.email, flowId, otp: '999999' } }, fifth);
  assert.match(fifth.body.message, /invalid or expired/i);
  const sixth = response();
  await verifyResetOtpController({ body: { email: user.email, flowId, otp: '123456' } }, sixth);
  assert.match(sixth.body.message, /invalid or expired/i);
});

test('expired OTPs and expired reset authorizations are rejected', async (t) => {
  process.env.NODE_ENV = 'test';
  const user = await userWithPassword();
  const flowId = createResetFlowId(user.email);
  const expiredOtp = { _id: 'expired-record', otpHash: await bcrypt.hash('123456', 4), flowIdHash: hashResetSecret(flowId), flowIdExpiresAt: new Date(Date.now() + RESET_FLOW_TTL_MS), otpExpiresAt: new Date(Date.now() - 1), otpAttempts: 0 };
  stub(t, Register, 'findOne', () => ({ select: async () => user }));
  stub(t, PasswordResetOTP, 'findOne', () => ({ select: async () => expiredOtp }));
  const expiredOtpResponse = response();
  await verifyResetOtpController({ body: { email: user.email, flowId, otp: '123456' } }, expiredOtpResponse);
  assert.equal(expiredOtpResponse.statusCode, 400);
  assert.match(expiredOtpResponse.body.message, /invalid or expired/i);

  stub(t, PasswordResetOTP, 'findOneAndUpdate', async () => null);
  const expiredAuthorizationResponse = response();
  await completeForgotPasswordResetController({ body: { email: user.email, resetAuthorization: 'a'.repeat(43), newPassword: 'NewPassword2!' } }, expiredAuthorizationResponse);
  assert.equal(expiredAuthorizationResponse.statusCode, 400);
  assert.match(expiredAuthorizationResponse.body.message, /invalid or expired/i);
});

test('weak password is rejected before reset authorization can be consumed', async (t) => {
  process.env.NODE_ENV = 'test';
  const user = await userWithPassword();
  stub(t, Register, 'findOne', () => ({ select: async () => user }));
  stub(t, PasswordResetOTP, 'findOneAndUpdate', async () => assert.fail('weak password must not consume authorization'));
  const res = response();
  await completeForgotPasswordResetController({ body: { email: user.email, resetAuthorization: 'a'.repeat(43), newPassword: 'weak' } }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /8–128 characters/i);
});

after(() => {
  if (originalEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnv;
  if (originalResetFlowSecret === undefined) delete process.env.RESET_FLOW_SECRET;
  else process.env.RESET_FLOW_SECRET = originalResetFlowSecret;
  if (originalRefreshTokenSecret === undefined) delete process.env.REFRESH_TOKEN_SECRET;
  else process.env.REFRESH_TOKEN_SECRET = originalRefreshTokenSecret;
});
