import test, { before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Register } from '../modules/userRegister.js';
import { ShopRequest } from '../modules/shopRequestSchema.js';
import { AuthAuditLog } from '../modules/authAuditLog.js';
import { userLoginController } from '../controllers/authController/userloginController.js';
import { userLogoutController } from '../controllers/authController/userlogOutController.js';
import { resetPasswordController } from '../controllers/authController/resetPasswordController.js';
import { verifyToken } from '../middleware/verifyToken.js';
import isAdmin from '../middleware/isAdmin.js';
import { csrfProtection, issueCsrfToken } from '../middleware/csrfProtection.js';
import { getTrustedOrigins, isTrustedOrigin } from '../config/trustedOrigins.js';
import { clearAuthCookies, parseExpiryToMs, setAuthCookies } from '../utils/authCookies.js';
import { getPaymentFailureRetryUrl } from '../utils/orderEmail.js';

const envKeys = ['NODE_ENV', 'FRONTEND_ORIGIN', 'RENDER_EXTERNAL_URL', 'ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET', 'ACCESS_TOKEN_EXPIRE', 'REFRESH_TOKEN_EXPIRE'];
const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

before(() => {
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
  process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-that-is-at-least-32-characters-long';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-that-is-at-least-32-characters-long';
  process.env.ACCESS_TOKEN_EXPIRE = '15m';
  process.env.REFRESH_TOKEN_EXPIRE = '1h';
});

after(() => {
  for (const key of envKeys) {
    if (previousEnv[key] === undefined) delete process.env[key];
    else process.env[key] = previousEnv[key];
  }
});

afterEach(() => {
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
  delete process.env.RENDER_EXTERNAL_URL;
});

const validId = '64b000000000000000000001';
const password = 'GoodPassword1!';
const makeUser = async (overrides = {}) => ({
  _id: validId,
  email: 'person@example.com',
  userName: 'Test Person',
  phone: '0123456789',
  password: await bcrypt.hash(password, 4),
  role: 'USER',
  isVerified: true,
  isSuspended: false,
  failedLoginAttempts: 0,
  consecutiveLockouts: 0,
  lockUntil: null,
  tokenVersion: 0,
  cart: [],
  ...overrides,
});

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  cookies: [],
  clearedCookies: [],
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  cookie(name, value, options) { this.cookies.push({ name, value, options }); return this; },
  clearCookie(name, options) { this.clearedCookies.push({ name, options }); return this; },
});

const stubMethod = (t, object, key, implementation) => {
  const original = object[key];
  object[key] = implementation;
  t.after(() => { object[key] = original; });
};

const stubLoginRecords = (t, { user = null, dealer = null, auditEvents = [] } = {}) => {
  stubMethod(t, Register, 'findOne', (filter) => ({ select: async () => filter.email === user?.email ? user : null }));
  stubMethod(t, ShopRequest, 'findOne', (filter) => ({ select: async () => filter.email === dealer?.email ? dealer : null }));
  const failOneAttempt = (account) => async () => {
    if (!account) return null;
    if (account.lockUntil && account.lockUntil > Date.now()) return null;
    if (account.lockUntil && account.lockUntil <= Date.now()) account.failedLoginAttempts = 0;
    account.failedLoginAttempts = (account.failedLoginAttempts || 0) + 1;
    if (account.failedLoginAttempts >= 7) {
      account.consecutiveLockouts = (account.consecutiveLockouts || 0) + 1;
      const duration = [15, 30, 60][Math.min(account.consecutiveLockouts - 1, 2)];
      account.lockUntil = new Date(Date.now() + duration * 60 * 1000);
    } else if (account.lockUntil && account.lockUntil <= Date.now()) {
      account.lockUntil = null;
    }
    return {
      failedLoginAttempts: account.failedLoginAttempts,
      consecutiveLockouts: account.consecutiveLockouts,
      lockUntil: account.lockUntil,
    };
  };
  stubMethod(t, Register, 'findOneAndUpdate', failOneAttempt(user));
  stubMethod(t, ShopRequest, 'findOneAndUpdate', failOneAttempt(dealer));
  stubMethod(t, Register, 'updateOne', async () => ({ acknowledged: true, matchedCount: 1, modifiedCount: 1 }));
  stubMethod(t, ShopRequest, 'updateOne', async () => ({ acknowledged: true, matchedCount: 1, modifiedCount: 1 }));
  stubMethod(t, AuthAuditLog, 'create', async (entry) => { auditEvents.push(entry); return entry; });
};

test('regular user login sets access and refresh cookies and preserves the response shape', async (t) => {
  const user = await makeUser();
  stubLoginRecords(t, { user });
  stubMethod(t, Register, 'updateOne', async () => ({ acknowledged: true }));
  const res = makeResponse();

  await userLoginController({ body: { email: user.email, password } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.accountType, 'USER');
  assert.equal(res.body.user.id, validId);
  assert.deepEqual(res.cookies.map(({ name }) => name), ['accessToken', 'refreshToken']);
  assert.equal(jwt.verify(res.cookies[0].value, process.env.ACCESS_TOKEN_SECRET).accountType, 'USER');
});

test('ADMIN role in the Users collection receives an ADMIN role claim and remains admin-authorized', async (t) => {
  const admin = await makeUser({ role: 'ADMIN' });
  stubLoginRecords(t, { user: admin });
  stubMethod(t, Register, 'updateOne', async () => ({ acknowledged: true }));
  const res = makeResponse();
  await userLoginController({ body: { email: admin.email, password } }, res);

  const claims = jwt.verify(res.cookies[0].value, process.env.ACCESS_TOKEN_SECRET);
  assert.equal(claims.role, 'ADMIN');
  assert.equal(claims.accountType, 'USER', 'accountType identifies the Users model; role carries authorization');
  assert.notEqual(res.cookies[0].value, res.cookies[1].value, 'access and refresh tokens use independent secrets');

  stubMethod(t, Register, 'findById', async () => admin);
  const authRes = makeResponse();
  let identity;
  // verifyToken sets the trusted database-backed identity on the request.
  const req = { headers: {}, cookies: { accessToken: res.cookies[0].value } };
  await verifyToken(req, authRes, () => { identity = req.user; });
  assert.equal(identity.role, 'ADMIN');
  let authorized = false;
  isAdmin({ user: identity }, makeResponse(), () => { authorized = true; });
  assert.equal(authorized, true);

  const dealerRoleResponse = makeResponse();
  let dealerAuthorized = false;
  isAdmin({ user: { role: 'ADMIN', accountType: 'DEALER' } }, dealerRoleResponse, () => { dealerAuthorized = true; });
  assert.equal(dealerRoleResponse.statusCode, 403);
  assert.equal(dealerAuthorized, false);

  const { iat, exp, ...identityClaims } = claims;
  const expiredAccess = jwt.sign(identityClaims, process.env.ACCESS_TOKEN_SECRET, { expiresIn: -1 });
  const refreshRes = makeResponse();
  const refreshReq = { headers: {}, cookies: { accessToken: expiredAccess, refreshToken: res.cookies[1].value } };
  let refreshed = false;
  await verifyToken(refreshReq, refreshRes, () => { refreshed = true; });
  assert.equal(refreshed, true);
  assert.equal(jwt.verify(refreshRes.cookies[0].value, process.env.ACCESS_TOKEN_SECRET).role, 'ADMIN');
});

test('cookies issued by login authenticate a protected request', async (t) => {
  const user = await makeUser();
  stubLoginRecords(t, { user });
  stubMethod(t, Register, 'updateOne', async () => ({ acknowledged: true }));
  const loginResponse = makeResponse();
  await userLoginController({ body: { email: user.email, password } }, loginResponse);

  stubMethod(t, Register, 'findById', async () => user);
  const cookies = Object.fromEntries(loginResponse.cookies.map(({ name, value }) => [name, value]));
  const protectedResponse = makeResponse();
  let nextCalled = false;
  await verifyToken({ headers: {}, cookies }, protectedResponse, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(protectedResponse.statusCode, 200);
});

test('approved dealer login issues dealer tokens', async (t) => {
  const dealer = await makeUser({ role: 'DEALER', status: 'APPROVED', shopName: 'Test Shop' });
  stubLoginRecords(t, { dealer });
  const res = makeResponse();

  await userLoginController({ body: { email: dealer.email, password } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.accountType, 'DEALER');
  assert.equal(jwt.verify(res.cookies[0].value, process.env.ACCESS_TOKEN_SECRET).accountType, 'DEALER');
});

test('dealer failed-password attempts lock only on the seventh failure', async (t) => {
  const dealer = await makeUser({ role: 'DEALER', status: 'APPROVED' });
  stubLoginRecords(t, { dealer });
  const responses = [];
  for (let count = 0; count < 7; count += 1) {
    const res = makeResponse();
    await userLoginController({ body: { email: dealer.email, password: 'WrongPassword1!' } }, res);
    responses.push(res);
  }

  assert.deepEqual(responses.map((res) => res.statusCode), [401, 401, 401, 401, 401, 401, 401]);
  assert.ok(dealer.lockUntil.getTime() - Date.now() <= 15 * 60 * 1000);
  assert.ok(dealer.lockUntil.getTime() - Date.now() > 14 * 60 * 1000);
  assert.equal(dealer.consecutiveLockouts, 1);
});

test('incorrect passwords and unknown emails return the same generic response', async (t) => {
  const user = await makeUser();
  stubLoginRecords(t, { user });
  stubMethod(t, Register, 'updateOne', async () => ({ modifiedCount: 1 }));
  const badPassword = makeResponse();
  await userLoginController({ body: { email: user.email, password: 'WrongPassword1!' } }, badPassword);
  const unknown = makeResponse();
  await userLoginController({ body: { email: 'unknown@example.com', password } }, unknown);

  assert.equal(badPassword.statusCode, 401);
  assert.equal(unknown.statusCode, 401);
  assert.deepEqual(badPassword.body, unknown.body);
});

test('unverified and suspended users cannot log in', async (t) => {
  const unverified = await makeUser({ isVerified: false });
  stubLoginRecords(t, { user: unverified });
  const unverifiedResponse = makeResponse();
  await userLoginController({ body: { email: unverified.email, password } }, unverifiedResponse);
  assert.equal(unverifiedResponse.statusCode, 403);
  assert.equal(unverifiedResponse.body.isVerified, false);

  const suspended = await makeUser({ isSuspended: true });
  stubLoginRecords(t, { user: suspended });
  const suspendedResponse = makeResponse();
  await userLoginController({ body: { email: suspended.email, password } }, suspendedResponse);
  assert.equal(suspendedResponse.statusCode, 403);
  assert.match(suspendedResponse.body.message, /suspended/i);
});

test('seven consecutive bad passwords lock for 15 minutes and record audit events', async (t) => {
  const user = await makeUser();
  const auditEvents = [];
  stubLoginRecords(t, { user, auditEvents });

  const responses = [];
  for (let count = 0; count < 7; count += 1) {
    const res = makeResponse();
    await userLoginController({ body: { email: user.email, password: 'WrongPassword1!' } }, res);
    responses.push(res);
  }

  assert.deepEqual(responses.map((res) => res.statusCode), [401, 401, 401, 401, 401, 401, 401]);
  assert.equal(user.failedLoginAttempts, 7);
  assert.ok(user.lockUntil.getTime() - Date.now() <= 15 * 60 * 1000);
  assert.ok(user.lockUntil.getTime() - Date.now() > 14 * 60 * 1000);
  assert.equal(auditEvents.length, 7);
  assert.equal(auditEvents.at(-1).event, 'ACCOUNT_LOCKED');
  assert.equal(auditEvents.at(-1).lockDurationMinutes, 15);

  const lockedAttempt = makeResponse();
  await userLoginController({ body: { email: user.email, password } }, lockedAttempt);
  assert.equal(lockedAttempt.statusCode, 401);
  assert.deepEqual(lockedAttempt.body, { success: false, message: 'Invalid email or password.' });
  assert.equal(user.failedLoginAttempts, 7);
});

test('an expired 15-minute lock clears its old counter and accepts a fresh attempt window', async (t) => {
  const user = await makeUser({ failedLoginAttempts: 7, lockUntil: new Date(Date.now() - 1) });
  stubLoginRecords(t, { user });
  const res = makeResponse();
  await userLoginController({ body: { email: user.email, password: 'WrongPassword1!' }, ip: '203.0.113.7' }, res);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { success: false, message: 'Invalid email or password.' });
  assert.equal(user.failedLoginAttempts, 1);
  assert.equal(user.lockUntil, null);
});

test('repeated lockouts escalate to 30 minutes then 60 minutes and cap at one hour', async (t) => {
  const user = await makeUser();
  const auditEvents = [];
  stubLoginRecords(t, { user, auditEvents });

  const lockAgain = async (expectedMinutes, expectedLockouts) => {
    user.lockUntil = new Date(Date.now() - 1);
    user.failedLoginAttempts = 7;
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const res = makeResponse();
      await userLoginController({ body: { email: user.email, password: 'WrongPassword1!' } }, res);
      if (attempt === 6) {
        assert.equal(res.statusCode, 401);
        assert.equal(res.body.message, 'Invalid email or password.');
      } else {
        assert.equal(res.statusCode, 401);
      }
    }
    assert.ok(user.lockUntil.getTime() - Date.now() <= expectedMinutes * 60 * 1000);
    assert.ok(user.lockUntil.getTime() - Date.now() > (expectedMinutes - 1) * 60 * 1000);
    assert.equal(user.consecutiveLockouts, expectedLockouts);
  };

  await lockAgain(15, 1);
  await lockAgain(30, 2);
  await lockAgain(60, 3);
  await lockAgain(60, 4);
  assert.deepEqual(
    auditEvents.filter(({ event }) => event === 'ACCOUNT_LOCKED').map(({ lockDurationMinutes }) => lockDurationMinutes),
    [15, 30, 60, 60],
  );
});

test('successful authentication clears the failed-attempt and consecutive-lockout counters', async (t) => {
  const user = await makeUser({ failedLoginAttempts: 4, consecutiveLockouts: 2 });
  stubLoginRecords(t, { user });
  stubMethod(t, Register, 'updateOne', async (_filter, update) => {
    Object.assign(user, update.$set);
    return { acknowledged: true, matchedCount: 1 };
  });

  const res = makeResponse();
  await userLoginController({ body: { email: user.email, password } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.failedLoginAttempts, 0);
  assert.equal(user.consecutiveLockouts, 0);
  assert.equal(user.lockUntil, null);
});

test('concurrent bad logins cannot pass the seventh-attempt lock boundary', async (t) => {
  const user = await makeUser();
  stubLoginRecords(t, { user });
  const responses = await Promise.all(Array.from({ length: 9 }, async () => {
    const res = makeResponse();
    await userLoginController({ body: { email: user.email, password: 'WrongPassword1!' } }, res);
    return res;
  }));
  assert.equal(user.failedLoginAttempts, 7);
  assert.ok(user.lockUntil > Date.now());
  assert.equal(responses.filter((res) => res.statusCode === 401).length, 9);
  assert.equal(responses.filter((res) => res.body.message !== 'Invalid email or password.').length, 0);
});

test('valid access tokens authenticate the current unsuspended account', async (t) => {
  const user = await makeUser();
  stubMethod(t, Register, 'findById', async () => user);
  const token = jwt.sign({ id: validId, email: user.email, role: 'USER', accountType: 'USER', ver: 0 }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  const res = makeResponse();
  let nextCalled = false;

  await verifyToken({ headers: {}, cookies: { accessToken: token } }, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('expired access tokens rotate from a valid refresh token', async (t) => {
  const user = await makeUser();
  stubMethod(t, Register, 'findById', async () => user);
  const expiredAccess = jwt.sign({ id: validId, role: 'USER', accountType: 'USER', ver: 0 }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '-1s' });
  const refresh = jwt.sign({ id: validId, email: user.email, role: 'USER', accountType: 'USER', ver: 0 }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '1h' });
  const res = makeResponse();
  let nextCalled = false;

  await verifyToken({ headers: {}, cookies: { accessToken: expiredAccess, refreshToken: refresh } }, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.cookies.length, 2);
  assert.equal(jwt.verify(res.cookies[0].value, process.env.ACCESS_TOKEN_SECRET).id, validId);
});

test('missing credentials and invalid refresh tokens return 401', async () => {
  const missingResponse = makeResponse();
  await verifyToken({ headers: {}, cookies: {} }, missingResponse, () => assert.fail('next must not run'));
  assert.equal(missingResponse.statusCode, 401);

  const invalidResponse = makeResponse();
  await verifyToken({ headers: {}, cookies: { refreshToken: 'not-a-jwt' } }, invalidResponse, () => assert.fail('next must not run'));
  assert.equal(invalidResponse.statusCode, 401);
  assert.deepEqual(invalidResponse.clearedCookies.map(({ name }) => name), ['accessToken', 'refreshToken']);

  const expiredRefresh = jwt.sign({ id: validId, role: 'USER', accountType: 'USER', ver: 0 }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '-1s' });
  const expiredRefreshResponse = makeResponse();
  await verifyToken({ headers: {}, cookies: { refreshToken: expiredRefresh } }, expiredRefreshResponse, () => assert.fail('expired refresh token must not authenticate'));
  assert.equal(expiredRefreshResponse.statusCode, 401);
});

test('expired access tokens without refresh credentials return 401 and clear cookies', async () => {
  const token = jwt.sign({ id: validId, role: 'USER', accountType: 'USER', ver: 0 }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '-1s' });
  const res = makeResponse();
  await verifyToken({ headers: {}, cookies: { accessToken: token } }, res, () => assert.fail('expired token must not authenticate'));
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.clearedCookies.map(({ name }) => name), ['accessToken', 'refreshToken']);
});

test('refresh tokens for missing, suspended, or unverified accounts are rejected', async (t) => {
  const user = await makeUser({ isSuspended: true });
  stubMethod(t, Register, 'findById', async () => user);
  const token = jwt.sign({ id: validId, role: 'USER', accountType: 'USER', ver: 0 }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '1h' });
  const res = makeResponse();

  await verifyToken({ headers: {}, cookies: { refreshToken: token } }, res, () => assert.fail('next must not run'));
  assert.equal(res.statusCode, 403);
  assert.equal(res.cookies.length, 0);
  assert.equal(res.clearedCookies.length, 2);

  const accessResponse = makeResponse();
  const accessToken = jwt.sign({ id: validId, role: 'USER', accountType: 'USER', ver: 0 }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  await verifyToken({ headers: {}, cookies: { accessToken } }, accessResponse, () => assert.fail('suspended account must not authenticate'));
  assert.equal(accessResponse.statusCode, 403);
});

test('logout revokes prior tokens and clears the matching auth cookies', async (t) => {
  let update;
  stubMethod(t, Register, 'updateOne', async (...args) => { update = args; return { modifiedCount: 1 }; });
  const res = makeResponse();

  await userLogoutController({ user: { id: validId, accountType: 'USER' } }, res, (error) => { throw error; });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(update[1], { $inc: { tokenVersion: 1 } });
  assert.deepEqual(res.clearedCookies.map(({ name }) => name), ['accessToken', 'refreshToken']);
});

test('password change revokes current tokens, clears cookies, and allows login with the new password', async (t) => {
  const user = await makeUser();
  user.save = async () => {};
  stubMethod(t, Register, 'findById', () => ({ select: async () => user }));
  stubMethod(t, Register, 'findOne', () => ({ select: async () => user }));
  stubMethod(t, Register, 'updateOne', async (_filter, update) => {
    if (update?.$inc?.tokenVersion) user.tokenVersion += update.$inc.tokenVersion;
    return { acknowledged: true };
  });

  const passwordResponse = makeResponse();
  await resetPasswordController({
    user: { id: validId, accountType: 'USER' },
    body: { currentPassword: password, newPassword: 'NewGoodPassword2!' },
  }, passwordResponse);

  assert.equal(passwordResponse.statusCode, 200);
  assert.equal(user.tokenVersion, 1);
  assert.deepEqual(passwordResponse.clearedCookies.map(({ name }) => name), ['accessToken', 'refreshToken']);

  const staleToken = jwt.sign({ id: validId, role: 'USER', accountType: 'USER', ver: 0 }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  const staleResponse = makeResponse();
  await verifyToken({ headers: {}, cookies: { accessToken: staleToken } }, staleResponse, () => assert.fail('pre-change access token must be rejected'));
  assert.equal(staleResponse.statusCode, 401);

  const loginResponse = makeResponse();
  await userLoginController({ body: { email: user.email, password: 'NewGoodPassword2!' } }, loginResponse);
  assert.equal(loginResponse.statusCode, 200);
  assert.equal(loginResponse.body.success, true);
  assert.equal(loginResponse.cookies.length, 2);

  const logoutResponse = makeResponse();
  await userLogoutController({ user: { id: validId, accountType: 'USER' } }, logoutResponse);
  assert.equal(logoutResponse.statusCode, 200);
  assert.equal(user.tokenVersion, 2);
  assert.deepEqual(logoutResponse.clearedCookies.map(({ name }) => name), ['accessToken', 'refreshToken']);
});

test('token-version changes revoke old access tokens and admin checks reject non-admins', async (t) => {
  const user = await makeUser({ tokenVersion: 1 });
  stubMethod(t, Register, 'findById', async () => user);
  const staleToken = jwt.sign({ id: validId, role: 'USER', accountType: 'USER', ver: 0 }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  const authResponse = makeResponse();
  await verifyToken({ headers: {}, cookies: { accessToken: staleToken } }, authResponse, () => assert.fail('stale token must not authenticate'));
  assert.equal(authResponse.statusCode, 401);

  const adminResponse = makeResponse();
  let nextCalled = false;
  isAdmin({ user: { role: 'USER' } }, adminResponse, () => { nextCalled = true; });
  assert.equal(adminResponse.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('CSRF generation, valid double-submit, and foreign-origin rejection work', () => {
  process.env.FRONTEND_ORIGIN = 'https://shop.example';
  const res = makeResponse();
  const token = issueCsrfToken({ cookies: {} }, res);
  assert.equal(res.cookies[0].name, 'csrfToken');
  assert.equal(res.cookies[0].options.httpOnly, false);

  let nextCalled = false;
  const validRequest = {
    method: 'POST',
    cookies: { csrfToken: token },
    get: (name) => name === 'X-CSRF-Token' ? token : 'https://shop.example',
  };
  csrfProtection(validRequest, makeResponse(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);

  const foreignResponse = makeResponse();
  csrfProtection({ ...validRequest, get: (name) => name === 'X-CSRF-Token' ? token : 'https://evil.example' }, foreignResponse, () => assert.fail('foreign origin must be rejected'));
  assert.equal(foreignResponse.statusCode, 403);

  const missingHeaderResponse = makeResponse();
  csrfProtection({ ...validRequest, get: (name) => name === 'Origin' ? 'https://shop.example' : undefined }, missingHeaderResponse, () => assert.fail('missing CSRF token must be rejected'));
  assert.equal(missingHeaderResponse.statusCode, 403);
});

test('trusted-origin policy restricts production to configured origins', () => {
  process.env.NODE_ENV = 'production';
  process.env.FRONTEND_ORIGIN = 'https://shop.example';
  const productionOrigins = getTrustedOrigins();
  assert.deepEqual(productionOrigins, ['https://shop.example']);
  assert.equal(isTrustedOrigin('https://shop.example', productionOrigins), true);
  assert.equal(isTrustedOrigin('https://attacker.example', productionOrigins), false);
  assert.throws(() => {
    process.env.FRONTEND_ORIGIN = 'http://shop.example';
    getTrustedOrigins();
  }, /HTTPS/);
  process.env.FRONTEND_ORIGIN = 'https://shop.example';
  process.env.NODE_ENV = 'development';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
  assert.deepEqual(getTrustedOrigins(), ['http://localhost:5173']);
});

test('payment failure retry links use the configured frontend origin', () => {
  process.env.CLIENT_URL = 'https://shop.example';
  assert.equal(getPaymentFailureRetryUrl(), 'https://shop.example/my-orders');
  delete process.env.CLIENT_URL;
});

test('access cookie security attributes and expiry match the JWT duration', () => {
  process.env.NODE_ENV = 'production';
  const res = makeResponse();
  setAuthCookies(res, 'access', 'refresh');
  assert.equal(res.cookies[0].options.httpOnly, true);
  assert.equal(res.cookies[0].options.secure, true);
  assert.equal(res.cookies[0].options.sameSite, 'none');
  assert.equal(res.cookies[0].options.maxAge, parseExpiryToMs(process.env.ACCESS_TOKEN_EXPIRE));
  clearAuthCookies(res);
  assert.ok(res.clearedCookies.every(({ options }) => options.secure && options.sameSite === 'none' && options.path === '/'));
});

test('hosted HTTPS storefront gets cross-site auth cookies even when NODE_ENV is unset', () => {
  delete process.env.NODE_ENV;
  process.env.FRONTEND_ORIGIN = 'https://asapong-phones-and-electronics.vercel.app';
  assert.deepEqual(getTrustedOrigins(), ['https://asapong-phones-and-electronics.vercel.app']);
  assert.equal(isTrustedOrigin('http://localhost:5173'), false);
  const res = makeResponse();
  setAuthCookies(res, 'access', 'refresh');
  assert.deepEqual(
    Object.fromEntries(['httpOnly', 'secure', 'sameSite', 'path'].map((key) => [key, res.cookies[0].options[key]])),
    { httpOnly: true, secure: true, sameSite: 'none', path: '/' },
  );
  clearAuthCookies(res);
  assert.ok(res.clearedCookies.every(({ options }) => options.secure && options.sameSite === 'none' && options.path === '/'));
});
