import mongoose from 'mongoose';

export const createHealthCheckHandler = (isDatabaseReady = () => mongoose.connection.readyState === 1) => (_req, res) => {
  const ready = Boolean(isDatabaseReady());
  return res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
};

export const healthCheckHandler = createHealthCheckHandler();
