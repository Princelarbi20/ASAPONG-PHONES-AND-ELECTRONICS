import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../../lib/axios';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

// Paystack statuses that mean "still in progress, check again shortly"
const IN_PROGRESS = ['pending', 'ongoing', 'processing', 'queued'];
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 3000;

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const hasVerified = useRef(false);
  const mounted = useRef(true);
  const timers = useRef([]);

  const [state, setState] = useState({ loading: true, error: '', retrying: false });

  // Track mount state and clear pending timers on unmount
  useEffect(() => {
    mounted.current = true;
    const activeTimers = timers.current;
    return () => {
      mounted.current = false;
      activeTimers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    if (!reference) {
      setState({
        loading: false,
        error: 'No payment reference was supplied by the payment provider.',
        retrying: false,
      });
      return;
    }

    // Guard against StrictMode running this effect twice in development
    if (hasVerified.current) return;
    hasVerified.current = true;

    const wait = (ms) =>
      new Promise((resolve) => {
        const id = setTimeout(resolve, ms);
        timers.current.push(id);
      });

    const verifyPayment = async () => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          // The server verifies the reference with Paystack, then updates the
          // order's payment status before this page reports success.
          const response = await axiosInstance.get(
            `/verify-payment/${encodeURIComponent(reference)}`
          );

          if (!mounted.current) return;

          if (response.data?.success && response.data?.order?.paymentStatus === 'PAID') {
            setState({ loading: false, error: '', retrying: false });
            const id = setTimeout(() => navigate('/my-orders', { replace: true }), 1800);
            timers.current.push(id);
            return;
          }

          throw new Error(response.data?.message || 'Payment could not be confirmed.');
        } catch (error) {
          if (!mounted.current) return;

          // The backend includes the raw Paystack transaction in `data` for non-success results
          const paystackStatus = String(error.response?.data?.data?.status || '').toLowerCase();
          const stillInProgress = IN_PROGRESS.includes(paystackStatus);

          if (stillInProgress && attempt < MAX_ATTEMPTS) {
            setState({ loading: true, error: '', retrying: true });
            await wait(RETRY_DELAY_MS);
            if (!mounted.current) return;
            continue;
          }

          const message =
            error.response?.data?.message ||
            error.message ||
            'Payment verification failed.';

          setState({
            loading: false,
            retrying: false,
            error: stillInProgress
              ? 'Your payment is still being processed. Your order will update automatically once it is confirmed. Check "My orders" in a few minutes.'
              : `${message} If you were charged, your order will update shortly.`,
          });
          return;
        }
      }
    };

    verifyPayment();
  }, [navigate, searchParams]);

  if (state.loading) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-green-600" />
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Verifying your payment</h1>
        <p className="mt-2 text-sm text-slate-500">
          {state.retrying
            ? 'Your payment is still processing. Checking again…'
            : 'Please wait while we confirm payment and update your order.'}
        </p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
        <XCircle className="h-12 w-12 text-red-600" />
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Payment needs attention</h1>
        <p className="mt-2 text-sm text-slate-600">{state.error}</p>
        <Link
          to="/my-orders"
          className="mt-6 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        >
          View my orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <CheckCircle2 className="h-12 w-12 text-green-600" />
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Payment confirmed</h1>
      <p className="mt-2 text-sm text-slate-600">
        Your order has been marked as paid. Taking you to your orders…
      </p>
    </div>
  );
}
