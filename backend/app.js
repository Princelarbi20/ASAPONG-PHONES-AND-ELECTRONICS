
import 'dotenv/config';
import connectDB from './config/db.js';
import express from 'express';
import errorHandler from './middleware/errorHandler.js';
import cors from 'cors';
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

import {
  csrfProtection,
  issueCsrfToken
} from './middleware/csrfProtection.js';

import { paystackWebhookController } from './controllers/Payment-controllers/paymentWebhookController.js';
import { validateRequest } from './middleware/requestValidation.js';
import { assertTestEnvironment } from './config/environmentSafety.js';
import {
  getTrustedOrigins,
  isTrustedOrigin
} from './config/trustedOrigins.js';

import { parseExpiryToMs } from './utils/authCookies.js';
import {
  cloudinary,
  isCloudinaryConfigured
} from './utils/cloudinaryHelpers.js';

import { cleanupPartialUploads } from './utils/uploadCleanup.js';

const app = express();

assertTestEnvironment();

// Validate required environment variables
for (const variable of [
  ...(process.env.NODE_ENV === 'test'
    ? ['TEST_MONGO_URI']
    : ['MONGO_URI']),
  'ACCESS_TOKEN_SECRET',
  'ACCESS_TOKEN_EXPIRE',
  'REFRESH_TOKEN_SECRET',
  'REFRESH_TOKEN_EXPIRE',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_BASE_URL',
  'FRONTEND_ORIGIN'
]) {
  if (!process.env[variable]) {
    throw new Error(
      `${variable} must be configured before the server starts.`
    );
  }
}

// Validate JWT secrets
for (const variable of [
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET'
]) {
  if (process.env[variable].length < 32) {
    throw new Error(
      `${variable} must be at least 32 characters long.`
    );
  }
}

if (
  process.env.ACCESS_TOKEN_SECRET ===
  process.env.REFRESH_TOKEN_SECRET
) {
  throw new Error(
    'ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different values.'
  );
}

// Validate token expiry durations
for (const variable of [
  'ACCESS_TOKEN_EXPIRE',
  'REFRESH_TOKEN_EXPIRE'
]) {
  if (!/^[1-9]\d*[smhd]$/i.test(process.env[variable])) {
    throw new Error(
      `${variable} must use a positive duration such as 15m, 12h, or 7d.`
    );
  }

  parseExpiryToMs(process.env[variable]);
}

// Trusted frontend origins
const allowedOrigins = getTrustedOrigins();

// Production environment validation
if (process.env.NODE_ENV === 'production') {
  for (const variable of [
    'EMAIL_USER',
    'EMAIL_PASS',
    'CLIENT_URL'
  ]) {
    if (!process.env[variable]?.trim()) {
      throw new Error(
        `${variable} must be configured in production for account verification emails.`
      );
    }
  }

  if (!isCloudinaryConfigured) {
    throw new Error(
      'CLOUDINARY_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required in production for durable uploads.'
    );
  }
}

// Validate Cloudinary configuration
const cloudinaryVariables = [
  'CLOUDINARY_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const configuredCloudinaryVariables =
  cloudinaryVariables.filter(
    (variable) => process.env[variable]?.trim()
  );

if (
  configuredCloudinaryVariables.length > 0 &&
  configuredCloudinaryVariables.length !== cloudinaryVariables.length
) {
  throw new Error(
    'Configure CLOUDINARY_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET together.'
  );
}

// Validate Paystack secret key
if (
  !/^sk_(test|live)_[A-Za-z0-9]+$/.test(
    process.env.PAYSTACK_SECRET_KEY
  )
) {
  throw new Error(
    'PAYSTACK_SECRET_KEY must be a valid Paystack secret key.'
  );
}

// Validate Paystack API URL
let paystackUrl;

try {
  paystackUrl = new URL(process.env.PAYSTACK_BASE_URL);
} catch {
  throw new Error(
    'PAYSTACK_BASE_URL must be the official Paystack API URL.'
  );
}

if (
  paystackUrl.protocol !== 'https:' ||
  paystackUrl.hostname !== 'api.paystack.co' ||
  paystackUrl.pathname !== '/' ||
  paystackUrl.search ||
  paystackUrl.hash ||
  paystackUrl.username ||
  paystackUrl.password
) {
  throw new Error(
    'PAYSTACK_BASE_URL must use https://api.paystack.co.'
  );
}

// Validate frontend URL
if (
  process.env.NODE_ENV === 'production' &&
  !process.env.CLIENT_URL
) {
  throw new Error(
    'CLIENT_URL must be configured in production for payment failure email links.'
  );
}

if (process.env.CLIENT_URL) {
  let clientOrigin;

  try {
    const parsedClientUrl = new URL(process.env.CLIENT_URL);

    if (
      parsedClientUrl.pathname !== '/' ||
      parsedClientUrl.search ||
      parsedClientUrl.hash
    ) {
      throw new Error();
    }

    clientOrigin = parsedClientUrl.origin;
  } catch {
    throw new Error(
      'CLIENT_URL must be a frontend origin without a path.'
    );
  }

  if (!allowedOrigins.includes(clientOrigin)) {
    throw new Error(
      'CLIENT_URL must match one of the configured FRONTEND_ORIGIN values.'
    );
  }
}

// Connect database
connectDB();

// ES Modules path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      callback(
        null,
        isTrustedOrigin(origin, allowedOrigins)
      );
    },

    credentials: true,

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token'
    ],

    methods: [
      'GET',
      'HEAD',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ]
  })
);

// Paystack webhook
// Raw body must be available before express.json()
app.post(
  '/api/v1/payments/webhook',
  express.raw({ type: 'application/json' }),
  validateRequest({ query: {} }),
  paystackWebhookController
);

// Global middleware
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Cleanup uncommitted uploads after request completion
app.use((req, res, next) => {
  res.once('finish', () => {
    if (!req[Symbol.for('asapong.uploadsCommitted')]) {
      cleanupPartialUploads(req).catch((error) => {
        console.error(
          'Failed to clean up uncommitted uploads:',
          error
        );
      });
    }
  });

  next();
});

// CSRF protection
app.use('/api/v1', csrfProtection);

// CSRF token endpoint
app.get(
  '/api/v1/csrf-token',
  validateRequest({
    query: {},
    body: {}
  }),
  (req, res) => {
    res.json({
      csrfToken: issueCsrfToken(req, res)
    });
  }
);

// API routes
app.use('/api/v1', adminRouter);
app.use('/api/v1', userRouter);
app.use('/api/v1', authRouter);
app.use('/api/v1', paymentRouter);

// Protected certificate uploads
app.use(
  '/uploads/certificates',
  verifyToken,
  refreshToken,
  isAdmin,
  (req, res, next) => {
    const assetPath = decodeURIComponent(
      req.path.replace(/^\/+/, '')
    );

    if (!assetPath.startsWith('dealer-certificates-')) {
      return express
        .static(path.join(__dirname, 'uploads', 'certificates'))(
          req,
          res,
          next
        );
    }

    if (
      !isCloudinaryConfigured ||
      !/^dealer-certificates-[A-Za-z0-9_.-]+\.pdf$/.test(assetPath)
    ) {
      return res.status(404).json({
        success: false,
        message: 'File not found.'
      });
    }

    const signedUrl = cloudinary.utils.private_download_url(
      assetPath,
      'pdf',
      {
        resource_type: 'raw',
        type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + 300,
        attachment: true
      }
    );

    return res.redirect(302, signedUrl);
  }
);

// General uploads
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

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
