import connectDB from './config/db.js';
import express from 'express';
import dotenv from 'dotenv';
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

const app = express();
// Resolve the backend env file from this module's location so startup works
// whether the app is launched from backend/ or from the repository root.
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });
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
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
  })
);


app.post('/api/v1/payments/webhook',express.raw({ type: 'application/json' }),validateRequest({ query: {} }),paystackWebhookController);

// Middlewares
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
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
