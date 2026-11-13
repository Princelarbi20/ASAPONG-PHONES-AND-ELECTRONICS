import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Register } from '../modules/userRegister.js';

test('registration email, OTP verification, and automatic sign-in work in production mode', async (t) => {
  const envKeys = [
    'NODE_ENV', 'FRONTEND_ORIGIN', 'ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET',
    'ACCESS_TOKEN_EXPIRE', 'REFRESH_TOKEN_EXPIRE', 'EMAIL_SINK', 'EMAIL_USER', 'EMAIL_PASS',
  ];
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    NODE_ENV: 'production',
    FRONTEND_ORIGIN: 'https://shop.example',
    ACCESS_TOKEN_SECRET: 'production-flow-access-secret-for-integration-test',
    REFRESH_TOKEN_SECRET: 'production-flow-refresh-secret-for-integration-test',
    ACCESS_TOKEN_EXPIRE: '15m',
    REFRESH_TOKEN_EXPIRE: '7d',
    EMAIL_USER: 'test-sender@example.test',
    EMAIL_PASS: 'test-only-password',
  });
  delete process.env.EMAIL_SINK;
  const [{ authRouter }, { csrfProtection, issueCsrfToken }] = await Promise.all([
    import('../route/authRouter.js'),
    import('../middleware/csrfProtection.js'),
  ]);
  t.after(() => {
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
  });

  let storedUser = null;
  let deliveredOtp = null;
  let emailDeliveryCount = 0;
  const originalFindOne = Register.findOne;
  const originalFindById = Register.findById;
  const originalUpdateOne = Register.updateOne;
  const originalSave = Register.prototype.save;
  Register.findOne = (filter) => ({
    select: async () => filter.email === storedUser?.email ? storedUser : null,
  });
  Register.findById = () => ({
    select: async () => storedUser,
    then: (resolve, reject) => Promise.resolve(storedUser).then(resolve, reject),
  });
  Register.updateOne = async (filter, update) => {
    const matches = storedUser
      && String(storedUser._id) === String(filter._id)
      && storedUser.isVerified === filter.isVerified
      && storedUser.otp === filter.otp
      && storedUser.otpExpires > filter.otpExpires.$gt;
    if (!matches) return { modifiedCount: 0 };
    Object.assign(storedUser, update.$set);
    return { modifiedCount: 1 };
  };
  Register.prototype.save = async function saveForRegistrationFlow() {
    if (storedUser && (storedUser.email === this.email || storedUser.phone === this.phone) && storedUser !== this) {
      const duplicate = new Error('duplicate key');
      duplicate.code = 11000;
      duplicate.keyPattern = { email: 1 };
      throw duplicate;
    }
    storedUser = this;
    return this;
  };
  t.after(() => {
    Register.findOne = originalFindOne;
    Register.findById = originalFindById;
    Register.updateOne = originalUpdateOne;
    Register.prototype.save = originalSave;
  });

  const originalCreateTransport = nodemailer.createTransport;
  nodemailer.createTransport = () => ({
    sendMail: async (message) => {
      emailDeliveryCount += 1;
      const otpMatch = message.html.match(/<span[^>]*>\s*(\d{6})\s*<\/span>/i);
      deliveredOtp = otpMatch?.[1] || null;
      return { accepted: [message.to], rejected: [] };
    },
    close() {},
  });
  t.after(() => { nodemailer.createTransport = originalCreateTransport; });

  const app = express();
  app.use(cors({ origin: 'https://shop.example', credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/v1', csrfProtection);
  app.get('/api/v1/csrf-token', (req, res) => {
    res.json({ csrfToken: issueCsrfToken(req, res) });
  });
  app.use('/api/v1', authRouter);

  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
  const origin = 'https://shop.example';

  const sessionResponse = await fetch(`${baseUrl}/auth/session`, { headers: { Origin: origin } });
  assert.equal(sessionResponse.status, 401, 'an anonymous visitor has no authenticated session');

  const csrfResponse = await fetch(`${baseUrl}/csrf-token`, { headers: { Origin: origin } });
  assert.equal(csrfResponse.status, 200);
  const { csrfToken } = await csrfResponse.json();
  const csrfCookie = csrfResponse.headers.get('set-cookie')?.split(';', 1)[0];
  assert.ok(csrfToken);
  assert.ok(csrfCookie?.startsWith('csrfToken='));
  assert.match(csrfResponse.headers.get('set-cookie'), /Secure; SameSite=None/i);
  const mutationHeaders = {
    Origin: origin,
    'Content-Type': 'application/json',
    Cookie: csrfCookie,
    'X-CSRF-Token': csrfToken,
  };

  const registrationStart = performance.now();
  const registrationResponse = await fetch(`${baseUrl}/user-register`, {
    method: 'POST',
    headers: mutationHeaders,
    body: JSON.stringify({
      userName: 'New Visitor',
      email: 'new-visitor@example.com',
      phone: '0123456789',
      password: 'GoodPassword1!',
    }),
  });
  const registrationApiMs = Number((performance.now() - registrationStart).toFixed(1));
  const registrationBody = await registrationResponse.json();
  assert.equal(registrationResponse.status, 201, JSON.stringify(registrationBody));
  assert.equal(registrationBody.user.isVerified, false);
  assert.equal(registrationResponse.headers.getSetCookie().some((cookie) => /(?:accessToken|refreshToken)=/.test(cookie)), false);
  assert.equal(emailDeliveryCount, 1, 'registration waits for successful OTP email acceptance');
  assert.match(deliveredOtp || '', /^\d{6}$/);
  assert.ok(Number.isFinite(registrationApiMs));

  const duplicateResponse = await fetch(`${baseUrl}/user-register`, {
    method: 'POST',
    headers: mutationHeaders,
    body: JSON.stringify({
      userName: 'New Visitor',
      email: 'new-visitor@example.com',
      phone: '0123456789',
      password: 'GoodPassword1!',
    }),
  });
  assert.equal(duplicateResponse.status, 409, 'unique indexes reject duplicate account creation');
  assert.equal(emailDeliveryCount, 1, 'duplicate registration does not send another OTP email');

  const postOtp = (otp) => fetch(`${baseUrl}/verify-otp`, {
    method: 'POST',
    headers: mutationHeaders,
    body: JSON.stringify({ email: 'new-visitor@example.com', otp }),
  });

  const incorrectResponse = await postOtp('000000');
  assert.equal(incorrectResponse.status, 401);
  assert.equal(storedUser.isVerified, false, 'incorrect OTP does not verify or authenticate');
  assert.equal(incorrectResponse.headers.getSetCookie().length, 0);

  storedUser.otpExpires = new Date(Date.now() - 1000);
  const expiredResponse = await postOtp(deliveredOtp);
  assert.equal(expiredResponse.status, 400);
  assert.equal(storedUser.isVerified, false, 'expired OTP does not verify or authenticate');
  assert.equal(expiredResponse.headers.getSetCookie().length, 0);
  storedUser.otpExpires = new Date(Date.now() + 15 * 60 * 1000);

  const verificationResponse = await postOtp(deliveredOtp);
  const verificationBody = await verificationResponse.json();
  assert.equal(verificationResponse.status, 200, JSON.stringify(verificationBody));
  assert.equal(verificationBody.user.isVerified, true);
  assert.equal(storedUser.otp, null, 'OTP is consumed after successful verification');
  const authCookies = verificationResponse.headers.getSetCookie().map((cookie) => cookie.split(';', 1)[0]);
  assert.equal(authCookies.length, 2);
  assert.ok(authCookies.some((cookie) => cookie.startsWith('accessToken=')));
  assert.ok(authCookies.some((cookie) => cookie.startsWith('refreshToken=')));
  assert.ok(verificationResponse.headers.getSetCookie().every((cookie) => /HttpOnly; Secure; SameSite=None/i.test(cookie)));
  const accessToken = authCookies.find((cookie) => cookie.startsWith('accessToken=')).slice('accessToken='.length);
  const refreshToken = authCookies.find((cookie) => cookie.startsWith('refreshToken=')).slice('refreshToken='.length);
  for (const token of [accessToken, refreshToken]) {
    const claims = jwt.verify(token, token === accessToken ? process.env.ACCESS_TOKEN_SECRET : process.env.REFRESH_TOKEN_SECRET);
    assert.equal(claims.id, String(storedUser._id));
    assert.equal(claims.role, 'USER');
    assert.equal(claims.accountType, 'USER');
  }

  const replayResponse = await postOtp(deliveredOtp);
  assert.equal(replayResponse.status, 400, 'a consumed OTP cannot be reused');
  assert.equal(replayResponse.headers.getSetCookie().length, 0, 'reused OTP does not issue auth cookies');

  const sessionWithCookies = await fetch(`${baseUrl}/auth/session`, {
    headers: { Origin: origin, Cookie: `${csrfCookie}; ${authCookies.join('; ')}` },
  });
  assert.equal(sessionWithCookies.status, 200, 'new auth cookies restore the session');
  const restoredSession = await sessionWithCookies.json();
  assert.equal(restoredSession.user.email, 'new-visitor@example.com');
});
