const parsePositiveInteger = (value, fallback, name, max) => {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new Error(`${name} must be an integer from 1 to ${max}.`);
  }
  return parsed;
};

// Business rule: an online order reserves inventory for 30 minutes from checkout.
// Failed/abandoned attempts may be retried until this original deadline; retries do
// not extend it. COD orders and paid orders have no automatic expiry.
export const UNPAID_ORDER_EXPIRY_MINUTES = parsePositiveInteger(
  process.env.UNPAID_ORDER_EXPIRY_MINUTES,
  30,
  'UNPAID_ORDER_EXPIRY_MINUTES',
  24 * 60,
);

export const UNPAID_ORDER_EXPIRY_MS = UNPAID_ORDER_EXPIRY_MINUTES * 60 * 1000;
export const ORDER_EXPIRY_WORKER_INTERVAL_MS = parsePositiveInteger(
  process.env.ORDER_EXPIRY_WORKER_INTERVAL_MS,
  30_000,
  'ORDER_EXPIRY_WORKER_INTERVAL_MS',
  60 * 60 * 1000,
);
export const ORDER_EXPIRY_BATCH_SIZE = parsePositiveInteger(
  process.env.ORDER_EXPIRY_BATCH_SIZE,
  50,
  'ORDER_EXPIRY_BATCH_SIZE',
  500,
);
export const PAYSTACK_REFUND_RECONCILIATION_INTERVAL_MS = parsePositiveInteger(
  process.env.PAYSTACK_REFUND_RECONCILIATION_INTERVAL_MS,
  60_000,
  'PAYSTACK_REFUND_RECONCILIATION_INTERVAL_MS',
  60 * 60 * 1000,
);
