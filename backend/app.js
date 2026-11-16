import './config/loadEnvironment.js';
import connectDB from './config/db.js';
import express from 'express';
import errorHandler from './middleware/errorHandler.js';
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { performance } from 'node:perf_hooks';
import { userRouter } from './route/userRouter.js';
import { adminRouter } from './route/adminRouter.js';
import { paymentRouter } from './route/paymentRouter.js';
import { authRouter } from './route/authRouter.js';
import { verifyToken } from './middleware/verifyToken.js';
import { refreshToken } from './middleware/refreshToken.js';
import isAdmin from './middleware/isAdmin.js';
import { csrfProtection, issueCsrfToken } from './middleware/csrfProtection.js';

// Paystack webhook (needs the raw body, so it is registered before express.json())
import { paystackWebhookController } from './controllers/Payment-controllers/paymentWebhookController.js';
import { validateRequest } from './middleware/requestValidation.js';
import { assertTestEnvironment } from './config/environmentSafety.js';
import { randomUUID } from 'node:crypto';
import { startEmailOutboxWorker } from './utils/emailOutbox.js';
import { startOrderExpiryWorker } from './utils/orderExpiryWorker.js';
import { startPaystackRefundWorker } from './utils/paystackRefunds.js';
import { PaystackRefund } from './modules/paystackRefundSchema.js';
import { getTrustedOrigins } from './config/trustedOrigins.js';
const app = express();
assertTestEnvironment();


for (const variable of [
  ...(process.env.NODE_ENV === 'test' ? ['TEST_MONGO_URI'] : ['MONGO_URI']),
  'ACCESS_TOKEN_SECRET',
  'ACCESS_TOKEN_EXPIRE',
  'REFRESH_TOKEN_SECRET',
  'REFRESH_TOKEN_EXPIRE',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_BASE_URL',
  'FRONTEND_ORIGIN'
]) {
  if (!process.env[variable]) throw new Error(`${variable} must be configured before the server starts.`);
}
// --- ES MODULES PATH SETUPS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS (fixed: removed the leading space in the fallback origin)
// CORS (fixed: removed the leading space in the fallback origin)

// CORS configuration
// Use validated frontend origins instead of passing raw environment values.
const trustedOrigins = getTrustedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (e.g. server-to-server).
      if (!origin) {
        return callback(null, true);
      }

      // Allow only explicitly trusted frontend domains.
      if (trustedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Do not allow untrusted origins.
      return callback(null, false);
    },

    credentials: true,

    methods: [
      'GET',
      'HEAD',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
    ],

    exposedHeaders: [
      'X-Request-ID',
    ],

    optionsSuccessStatus: 204,
  })
);



app.post('/api/v1/payments/webhook',express.raw({ type: 'application/json' }),validateRequest({ query: {} }),paystackWebhookController);

// Middlewares
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  req.id = randomUUID();
  req.requestStartedAt = performance.now();
  res.setHeader('X-Request-ID', req.id);
  res.on('finish', () => {
    if (/\/(?:user-register|verify-otp|resend-otp)$/.test(req.path)) {
      console.info('[performance] auth_request', JSON.stringify({
        requestId: req.id,
        route: req.path,
        status: res.statusCode,
        durationMs: Number((performance.now() - req.requestStartedAt).toFixed(1)),
      }));
    }
  });
  next();
});
app.use('/api/v1', csrfProtection);
app.get('/api/v1/csrf-token', validateRequest({ query: {}, body: {} }), (req, res) => {
  res.json({ csrfToken: issueCsrfToken(req, res) });
});
app.use('/api/v1', adminRouter);
app.use('/api/v1', userRouter);
app.use('/api/v1', authRouter);
app.use('/api/v1', paymentRouter);

app.use('/uploads/certificates', verifyToken, refreshToken, isAdmin,
  express.static(path.join(__dirname, 'uploads', 'certificates')));
app.use('/uploads', (req, res, next) => {
  if (req.path === '/certificates' || req.path.startsWith('/certificates/')) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }
  return next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Endpoints


app.use(errorHandler);
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  const startedAt = performance.now();
  try {
    await connectDB();
    // The unique paymentAttempt index is the final database guard against
    // multiple refund records being created by simultaneous workers.
    await PaystackRefund.createIndexes();
    startEmailOutboxWorker();
    startOrderExpiryWorker();
    startPaystackRefundWorker();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
      console.info('[performance] app_ready', JSON.stringify({
        startupMs: Number((performance.now() - startedAt).toFixed(1)),
      }));
    });
  } catch (error) {
    console.error('[startup] database_connection_failed', JSON.stringify({
      name: error.name,
      code: error.code || null,
      startupMs: Number((performance.now() - startedAt).toFixed(1)),
    }));
    process.exit(1);
  }
};

startServer();
