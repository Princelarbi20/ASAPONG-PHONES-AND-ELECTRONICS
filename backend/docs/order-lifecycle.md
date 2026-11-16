# Online order expiry policy

- An online order reserves stock for **30 minutes from order creation** by default.
- Configure the window with `UNPAID_ORDER_EXPIRY_MINUTES` (integer, 1–1440). The 30-minute default is the proposed checkout business rule for this deployment.
- Failed and abandoned Paystack attempts remain retryable until the order's original deadline. Starting another attempt never extends `expiresAt`.
- Cash on delivery orders do not get `expiresAt` and are not handled by the expiry worker.
- Paid orders are excluded from expiry. Only online orders still in `PENDING` with payment status `PENDING`, `FAILED`, or `ABANDONED` expire.
- Expiry atomically changes status to `EXPIRED`, stamps `expiredAt` and `inventoryReleasedAt`, and restores the reserved item quantities in one MongoDB transaction.
- Expired and cancelled orders are terminal. Payment confirmation after either terminal state is reconciled as a late payment and must not activate the order.
- Verified captures against expired/cancelled orders, amount mismatches, and extra successful charges get a durable refund request tied to the exact Paystack attempt. A worker submits/reconciles it using the same stable refund reference; the order is never treated as refunded until Paystack reports `processed`.
- Admins can request a full refund for an active paid order through `POST /api/v1/orders/:id/refund`. The order remains PAID until Paystack confirms the refund; then it becomes REVERSED and can follow the existing cancellation transition. Repeated requests reuse the existing refund record.
- A definitive provider refund failure is recorded for operator review and is not blindly resubmitted with a new reference. Reconciliation needs a human decision before another refund attempt.
- The worker polls every 30 seconds by default (`ORDER_EXPIRY_WORKER_INTERVAL_MS`) and processes at most 50 orders per pass (`ORDER_EXPIRY_BATCH_SIZE`). Multiple Render instances may run it; the transactional order predicate and release marker ensure only one can restore a given order's inventory.

Orders created before this policy have no `paymentMethod` or `expiresAt`; they are intentionally not expired automatically because historical COD orders cannot safely be distinguished from online orders. A one-time data migration is needed if those records should be expired.
