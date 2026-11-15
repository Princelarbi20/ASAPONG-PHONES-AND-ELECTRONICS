// middleware/errorHandler.js

const errorHandler = (err, req, res, next) => {
  console.error(err?.stack || err);

  const statusCode = err?.statusCode || 500;
  const message = err?.message || "Internal Server Error";

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

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Request failed.' : message,
  });
};

export default errorHandler;
