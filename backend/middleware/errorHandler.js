// middleware/errorHandler.js

import { cleanupPartialUploads } from '../utils/uploadCleanup.js';

const errorHandler = async (err, req, res, next) => {
  if (res.headersSent) return next(err);

  try {
    await cleanupPartialUploads(req);
  } catch (cleanupError) {
    console.error('Failed to remove partial upload:', cleanupError);
  }

  if (err?.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token.'
    });
  }

  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large. Please upload a smaller file.'
    });
  }

  if (err?.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field received.'
    });
  }

  if (err?.name === 'MulterError') {
    return res.status(400).json({ success: false, message: 'Invalid file upload request.' });
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request payload is too large.' });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body contains invalid JSON.' });
  }

  if (err?.name === 'ValidationError') {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: Object.entries(err.errors || {}).map(([field, detail]) => ({ field, message: detail.message })),
    });
  }

  if (err?.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid request data.' });
  }

  if (err?.code === 11000) {
    return res.status(409).json({ success: false, message: 'A record with these details already exists.' });
  }

  const statusCode = err?.statusCode >= 400 && err?.statusCode < 500 ? err.statusCode : 500;
  const message = statusCode === 500 ? 'Request failed.' : (err?.publicMessage || err?.message || 'Invalid request.');
  if (statusCode === 500) console.error(err?.stack || err);

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorHandler;
