import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import axiosInstance from '../../lib/axios';
import { withCsrf } from '../../lib/csrf';

const CODE_LENGTH = 6;
const EXPIRY_MS = 5 * 60 * 1000;
const RESEND_SECONDS = 60;

export default function VerifyResetOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [flowId] = useState(() => location.state?.flowId || new URLSearchParams(window.location.hash.slice(1)).get('flowId') || '');
  const confirmationMessage = location.state?.confirmationMessage;
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [expiryTime, setExpiryTime] = useState(() => Date.now() + EXPIRY_MS);
  const [remaining, setRemaining] = useState(EXPIRY_MS);
  const [resendWait, setResendWait] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [verificationState, setVerificationState] = useState('idle');
  const refs = useRef([]);

  useEffect(() => {
    if (window.location.hash.includes('flowId=')) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
    }
  }, []);
  useEffect(() => {
    if (!flowId) navigate('/auth/forgot-password', { replace: true });
  }, [flowId, navigate]);
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(Math.max(0, expiryTime - Date.now())), 1000);
    return () => window.clearInterval(timer);
  }, [expiryTime]);
  useEffect(() => {
    if (resendWait <= 0) return undefined;
    const timer = window.setTimeout(() => setResendWait((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendWait]);

  const setDigits = (digits, start = 0) => {
    const clean = digits.replace(/\D/g, '').slice(0, CODE_LENGTH - start);
    const next = Array(CODE_LENGTH).fill('');
    clean.split('').forEach((digit, index) => { next[start + index] = digit; });
    setCode(next);
    refs.current[Math.min(start + clean.length, CODE_LENGTH - 1)]?.focus();
  };

  const updateDigit = (value, index) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setCode((current) => current.map((digit, position) => (position === index ? '' : digit)));
      return;
    }
    if (digits.length > 1) {
      setDigits(digits, index);
      return;
    }
    setCode((current) => current.map((digit, position) => (position === index ? digits : digit)));
    if (index < CODE_LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const submit = async (event) => {
    event.preventDefault();
    const otp = code.join('');
    if (!email.trim()) { setError('Enter the email address associated with this reset request.'); return; }
    if (otp.length !== CODE_LENGTH) { setError('Enter all six digits.'); return; }
    if (!remaining) { setError('This code has expired. Request a new code.'); return; }
    setLoading(true); setError(''); setVerificationState('loading');
    try {
      const config = await withCsrf({ withCredentials: true });
      const response = await axiosInstance.post('/verify-reset-otp', { email: email.trim().toLowerCase(), flowId, otp }, config);
      setVerificationState('success');
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      navigate('/auth/reset-password', {
        replace: true,
        state: {
          email,
          resetAuthorization: response.data.resetAuthorization,
          authorizationExpiresAt: response.data.authorizationExpiresAt,
        },
      });
    } catch (requestError) {
      setVerificationState('error');
      setError(requestError.response?.data?.message || 'Could not verify this code. Please try again.');
    } finally { setLoading(false); }
  };

  const resend = async () => {
    if (resendWait || resending || loading) return;
    setResending(true); setError('');
    try {
      const config = await withCsrf({ withCredentials: true });
      await axiosInstance.post('/resend-reset-otp', { email: email.trim().toLowerCase(), flowId }, config);
      setCode(Array(CODE_LENGTH).fill(''));
      setExpiryTime(Date.now() + EXPIRY_MS);
      setRemaining(EXPIRY_MS);
      setResendWait(RESEND_SECONDS);
      refs.current[0]?.focus();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not resend the code. Please try again later.');
    } finally { setResending(false); }
  };

  const isComplete = code.join('').length === CODE_LENGTH;
  const isExpired = remaining === 0;
  const isBusy = loading || resending;
  const formattedTime = `${String(Math.floor(remaining / 60000)).padStart(2, '0')}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;

  return (
    <div className="min-h-full w-full overflow-y-auto overscroll-contain bg-transparent">
      <style>{`
        @keyframes orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes counter-rotate { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        .animate-orbit { animation: orbit 15s linear infinite; }
        .animate-counter-rotate { animation: counter-rotate 15s linear infinite; }
        @keyframes reset-appear { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes reset-pop { 0% { opacity: 0; transform: scale(.65); } 75% { transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }
        .reset-appear { animation: reset-appear 420ms ease-out both; }
        .reset-pop { animation: reset-pop 360ms ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .animate-orbit, .animate-counter-rotate, .reset-appear, .reset-pop { animation: none; }
        }
      `}</style>

      <div className="flex min-h-full w-full items-center justify-center border border-slate-200/20 bg-white/10 px-4 py-6 shadow-lg backdrop-blur-sm sm:px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 sm:max-w-md sm:gap-5">

          {/* Illustration: sized by screen height, hidden on very short screens */}
          <div
            aria-hidden="true"
            className="reset-appear relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-purple-50/50 sm:h-32 sm:w-32 lg:h-36 lg:w-36"
          >
            <div className="absolute inset-2 rounded-full border border-purple-100/80" />
            <div className="absolute inset-4 rounded-full border border-purple-100/50" />

            <span className="absolute left-[15%] top-[16%] h-2 w-2 rounded-full bg-orange-400" />
            <span className="absolute bottom-[12%] left-[34%] h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="absolute right-[18%] top-[22%] h-2 w-2 rounded-full bg-amber-400" />

            <div className="relative z-10 flex h-[62%] w-[38%] flex-col items-center rounded-[16px] bg-indigo-600 p-1.5 shadow-md">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[11px] bg-indigo-400/80">
                <div className="absolute -right-6 -top-6 h-28 w-16 rotate-45 bg-white/20" />
              </div>
              <div className="absolute top-1.5 h-1 w-4 rounded-full bg-indigo-800" />
            </div>

            <div className="animate-orbit pointer-events-none absolute inset-0 z-20">
              <div className="absolute left-[18%] top-[18%] -translate-x-1/2 -translate-y-1/2">
                <div className="animate-counter-rotate flex items-center justify-center rounded-lg border-2 border-red-500 bg-white p-1 shadow-md">
                  <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="absolute right-[18%] top-[18%] -translate-y-1/2 translate-x-1/2">
                <div className="animate-counter-rotate flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md">1</div>
              </div>
              <div className="absolute bottom-[18%] right-[18%] translate-x-1/2 translate-y-1/2">
                <div className="animate-counter-rotate flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-md">2</div>
              </div>
              <div className="absolute bottom-[18%] left-[18%] -translate-x-1/2 translate-y-1/2">
                <div className="animate-counter-rotate flex h-6 w-6 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white shadow-md">3</div>
              </div>
            </div>
          </div>

          {/* Header */}
          <header className="max-w-xs space-y-1 text-center sm:max-w-sm">
            <h1 className="text-xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-2xl">
              Verify your email
            </h1>
            <p className="text-xs text-gray-500 sm:text-sm">
              Enter the email address and six-digit code from the reset message.
            </p>
            {confirmationMessage && (
              <p role="status" className="pt-1 text-xs text-indigo-700 sm:text-sm">
                {confirmationMessage}
              </p>
            )}
          </header>

          {/* OTP form */}
          <form onSubmit={submit} className="w-full space-y-3 sm:space-y-4" noValidate>
            {!email && (
              <label htmlFor="reset-verification-email" className="block space-y-1 text-sm font-medium text-gray-700">
                Email address
                <input id="reset-verification-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isBusy} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
              </label>
            )}
            <div
              className="flex items-center justify-center gap-1.5 sm:gap-3"
              onPaste={(event) => { event.preventDefault(); setDigits(event.clipboardData.getData('text')); }}
            >
              {code.map((digit, index) => {
                const hasValue = digit !== '';
                return (
                  <input
                    key={index}
                    ref={(element) => { refs.current[index] = element; }}
                    aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                    aria-describedby={error ? 'otp-error' : undefined}
                    aria-invalid={Boolean(error)}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    disabled={isBusy || isExpired}
                    onChange={(event) => updateDigit(event.target.value, index)}
                    onKeyDown={(event) => {
                      if (event.key === 'Backspace' && !code[index] && index > 0) refs.current[index - 1]?.focus();
                      if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
                      if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) refs.current[index + 1]?.focus();
                    }}
                    className={`h-12 w-full min-w-0 max-w-[3rem] flex-1 rounded-lg border bg-white text-center text-xl font-bold text-indigo-600 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 sm:h-14 sm:max-w-[3.5rem] sm:text-2xl ${
                      hasValue
                        ? 'border-green-300 ring-green-100'
                        : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-200'
                    } ${isBusy || isExpired ? 'cursor-not-allowed opacity-50' : ''}`}
                  />
                );
              })}
            </div>

            {/* Reserved status slot: timer + error never shift the layout */}
            <div className="flex min-h-[3rem] flex-col items-center justify-start gap-1">
              <p
                className={`text-center text-xs font-semibold sm:text-sm ${isExpired ? 'text-red-600' : 'text-gray-500'}`}
                aria-live="polite"
              >
                {isExpired ? 'Code expired. Request a new code below.' : `Code expires in ${formattedTime}`}
              </p>
              {error && (
                <p id="otp-error" className="reset-pop text-center text-xs text-red-600 sm:text-sm" role="alert">
                  {error}
                </p>
              )}
            </div>

            {verificationState === 'loading' && (
              <p role="status" className="flex items-center justify-center gap-2 text-sm text-indigo-700"><LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" /> Verifying your code…</p>
            )}
            {verificationState === 'success' && (
              <p role="status" className="reset-pop flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">✓</span> Code verified. Continue to choose a new password…</p>
            )}

            <button
              type="submit"
              disabled={isBusy || isExpired || !isComplete || !email.trim()}
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold uppercase tracking-wider shadow-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
                isComplete && !isBusy && !isExpired
                  ? 'bg-green-300 text-gray-900 hover:bg-green-400 active:bg-green-500'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300'
              }`}
            >
              {loading && <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" />}
              {loading ? 'VERIFYING...' : 'VERIFY CODE'}
            </button>
          </form>

          {/* Footer */}
          <footer className="flex w-full flex-col items-center border-t border-gray-100/50 pt-2 text-center">
            <p className="text-xs text-gray-500 sm:text-sm">Didn't receive the code?</p>
            <button
              type="button"
              onClick={resend}
              disabled={Boolean(resendWait) || resending || loading}
              className="min-h-10 rounded-md px-3 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              {resending ? 'RESENDING...' : resendWait ? `Resend in ${resendWait}s` : 'Resend Code'}
            </button>
            <Link
              to="/auth/forgot-password"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold text-gray-500 transition-colors duration-200 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:text-sm"
            >
              <ArrowLeft size={14} /> Change email address
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
