
import connectDB from './config/db.js';
import express from 'express';
import dotenv from 'dotenv';
import errorHandler from './middleware/errorHandler.js';
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { userRouter } from './route/userRouter.js';
import { adminRouter } from './route/adminRouter.js';
import { paymentRouter } from './route/paymentRouter.js';
import { authRouter } from './route/authRouter.js';
import { verifyToken } from './middleware/verifyToken.js';
import { refreshToken } from './middleware/refreshToken.js';
import isAdmin from './middleware/isAdmin.js';
import { csrfProtection, issueCsrfToken } from './middleware/csrfProtection.js';

// Paystack webhook
import { paystackWebhookController } from './controllers/Payment-controllers/paymentWebhookController.js';
import { validateRequest } from './middleware/requestValidation.js';
import { assertTestEnvironment } from './config/environmentSafety.js';

const app = express();

dotenv.config();
assertTestEnvironment();

// Validate required environment variables
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
  if (!process.env[variable]) {
    throw new Error(`${variable} must be configured before the server starts.`);
  }
}

connectDB();

// --- ES MODULES PATH SETUPS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CORS CONFIGURATION ---

const allowedOrigins = [process.env.FRONTEND_ORIGIN
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin header
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token'
    ],
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ]
  })
);

// --- PAYSTACK WEBHOOK ---
// Needs the raw body, so it is registered before express.json()

app.post(
  '/api/v1/payments/webhook',
  express.raw({ type: 'application/json' }),
  validateRequest({ query: {} }),
  paystackWebhookController
);

// --- GLOBAL MIDDLEWARES ---

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api/v1', csrfProtection);

app.get(
  '/api/v1/csrf-token',
  validateRequest({ query: {}, body: {} }),
  (req, res) => {
    res.json({ csrfToken: issueCsrfToken(req, res) });
  }
);

// --- ROUTES ---

app.use('/api/v1', adminRouter);
app.use('/api/v1', userRouter);
app.use('/api/v1', authRouter);
app.use('/api/v1', paymentRouter);

// --- PROTECTED CERTIFICATE UPLOADS ---

app.use(
  '/uploads/certificates',
  verifyToken,
  refreshToken,
  isAdmin,
  express.static(path.join(__dirname, 'uploads', 'certificates'))
);

// --- UPLOADS ---

app.use('/uploads', (req, res, next) => {
  if (
    req.path === '/certificates' ||
    req.path.startsWith('/certificates/')
  ) {
    return res.status(404).json({
      success: false,
      message: 'File not found.'
    });
  }

  return next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ERROR HANDLER ---

app.use(errorHandler);

// --- START SERVER ---

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
