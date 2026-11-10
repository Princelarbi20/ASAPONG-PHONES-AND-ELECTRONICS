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
import { issueCsrfToken } from './middleware/csrfProtection.js';

// Paystack webhook (needs the raw body, so it is registered before express.json())
import { paystackWebhookController } from './controllers/Payment-controllers/paymentWebhookController.js';

const app = express();
dotenv.config();


for (const variable of [
  'MONGO_URI',
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
connectDB();

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


app.post('/api/v1/payments/webhook',express.raw({ type: 'application/json' }),paystackWebhookController);

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.get('/api/v1/csrf-token', (req, res) => {
  res.json({ csrfToken: issueCsrfToken(req, res) });
});
app.use('/api/v1', adminRouter);
app.use('/api/v1', userRouter);
app.use('/api/v1', authRouter);
app.use('/api/v1', paymentRouter);

app.use('/uploads/certificates', verifyToken, refreshToken, isAdmin,
  express.static(path.join(__dirname, 'uploads', 'certificates')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Endpoints


app.use(errorHandler);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
