import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Register } from '../modules/userRegister.js';

test('a production-mode visitor can register after the expected anonymous session 401', async (t) => {
  const envKeys = [
    'NODE_ENV',
    'FRONTEND_ORIGIN',
    'ACCESS_TOKEN_SECRET',
    'REFRESH_TOKEN_SECRET',
    'EMAIL_SINK',
  ];
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    NODE_ENV: 'production',
    FRONTEND_ORIGIN: 'https://shop.example',
    ACCESS_TOKEN_SECRET: 'production-flow-access-secret-for-integration-test',
    REFRESH_TOKEN_SECRET: 'production-flow-refresh-secret-for-integration-test',
    EMAIL_SINK: 'true',
  });
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

  const originalFindOne = Register.findOne;
  const originalSave = Register.prototype.save;
  Register.findOne = async () => null;
  Register.prototype.save = async function saveForRegistrationFlow() { return this; };
  t.after(() => {
    Register.findOne = originalFindOne;
    Register.prototype.save = originalSave;
  });

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

  const sessionResponse = await fetch(`${baseUrl}/auth/session`, {
    headers: { Origin: origin },
  });
  assert.equal(sessionResponse.status, 401, 'an anonymous visitor has no authenticated session');

  const csrfResponse = await fetch(`${baseUrl}/csrf-token`, {
    headers: { Origin: origin },
  });
  assert.equal(csrfResponse.status, 200);
  const { csrfToken } = await csrfResponse.json();
  assert.ok(csrfToken);
  const csrfCookie = csrfResponse.headers.get('set-cookie')?.split(';', 1)[0];
  assert.ok(csrfCookie?.startsWith('csrfToken='));
  assert.match(csrfResponse.headers.get('set-cookie'), /Secure; SameSite=None/i);

  const registrationResponse = await fetch(`${baseUrl}/user-register`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      Cookie: csrfCookie,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      userName: 'New Visitor',
      email: 'new-visitor@example.com',
      phone: '0123456789',
      password: 'GoodPassword1!',
    }),
  });
  const registrationBody = await registrationResponse.json();
  assert.equal(registrationResponse.status, 201, JSON.stringify(registrationBody));
  assert.equal(registrationBody.success, true);
  assert.equal(registrationBody.user.email, 'new-visitor@example.com');
  assert.equal(registrationBody.user.isVerified, false);
});
