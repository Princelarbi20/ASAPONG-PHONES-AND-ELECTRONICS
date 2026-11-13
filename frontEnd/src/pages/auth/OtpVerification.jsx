import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import axiosInstance from '../../lib/axios';
import toast from 'react-hot-toast';
import { withCsrf } from '../../lib/csrf';
import { authAction } from '../../redux/store';


const OtpVerification = () => {
  const OTP_LENGTH = 6;
  const OTP_EXPIRY_MS = 15 * 60 * 1000;
  const RESEND_COOLDOWN_SECONDS = 60;
  const [otp, setOtp] = useState(new Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendWaitSeconds, setResendWaitSeconds] = useState(0);
  const inputRefs = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get email from navigation state
  const email = location.state?.email;
  const [expiresAt, setExpiresAt] = useState(() => {
    const serverExpiry = Date.parse(location.state?.otpExpiresAt || '');
    return Number.isFinite(serverExpiry) ? serverExpiry : Date.now() + OTP_EXPIRY_MS;
  });
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Redirect to register if no email is provided
  React.useEffect(() => {
    if (!email) {
      toast.error('Please register first to verify OTP');
      navigate('/auth/register');
    }
  }, [email, navigate]);

  React.useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (resendWaitSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setResendWaitSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendWaitSeconds]);

  const isComplete = otp.join('').length === OTP_LENGTH;
  const secondsRemaining = Math.max(0, Math.ceil((expiresAt - currentTime) / 1000));
  const isExpired = secondsRemaining === 0;
  const formattedTime = `${String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:${String(secondsRemaining % 60).padStart(2, '0')}`;

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, OTP_LENGTH);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp([...newOtp, ...new Array(OTP_LENGTH - newOtp.length).fill('')]);
      if (inputRefs.current[pastedData.length - 1]) {
        inputRefs.current[pastedData.length - 1].focus();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalOtp = otp.join('');

    if (isExpired) {
      toast.error('This OTP has expired. Please request a new code.');
      return;
    }

    if (finalOtp.length !== OTP_LENGTH) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const config = await withCsrf({ withCredentials: true });
      const response = await axiosInstance.post('/verify-otp', { email, otp: finalOtp }, config);

      if (response.data.success) {
        const user = response.data.user;
        dispatch(authAction.login({ user, role: user?.role, accountType: response.data.accountType }));
        toast.success('Email verified successfully! You are now signed in.');
        navigate('/', { replace: true });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'OTP verification failed. Please try again.';
      toast.error(errorMessage, {
        style: {
          border: '2px solid #ef4444',
          padding: '12px 16px',
          color: '#1f2937',
          fontWeight: '500',
          backgroundColor: '#fff',
        },
        duration: 2000,
      });
      
      // Reset OTP inputs on error
      setOtp(new Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (isResending || resendWaitSeconds > 0) return;
    setIsResending(true);
    try {
      const config = await withCsrf({ withCredentials: true });
      const response = await axiosInstance.post('/resend-otp', { email }, config);
      
      toast.success('OTP has been resent to your email');
      setOtp(new Array(OTP_LENGTH).fill(''));
      setExpiresAt(Date.parse(response.data.otpExpiresAt) || Date.now() + OTP_EXPIRY_MS);
      setCurrentTime(Date.now());
      setResendWaitSeconds(RESEND_COOLDOWN_SECONDS);
      inputRefs.current[0]?.focus();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to resend OTP. Please try again.';
      if (error.response?.status === 429 && Number.isFinite(error.response?.data?.retryAfterSeconds)) {
        setResendWaitSeconds(error.response.data.retryAfterSeconds);
      }
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full overflow-y-auto overscroll-contain bg-transparent font-sans antialiased">

      {/* Embedded keyframe styles for smooth infinite rotation */}
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes counter-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-orbit {
          animation: orbit 15s linear infinite;
        }
        .animate-counter-rotate {
          animation: counter-rotate 15s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-orbit, .animate-counter-rotate { animation: none; }
        }
      `}</style>

      {/* Main Container */}
      <div className="flex min-h-full w-full items-center justify-center border border-slate-200/20 bg-white/10 px-4 py-6 shadow-lg backdrop-blur-sm sm:px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 sm:max-w-md sm:gap-5">

          {/* Graphic Illustration: sized by screen height, hidden on very short screens */}
          <div
            aria-hidden="true"
            className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-purple-50/50 sm:h-36 sm:w-36 [@media(min-height:820px)]:h-48 [@media(min-height:820px)]:w-48 [@media(max-height:620px)]:hidden"
          >
            <div className="absolute inset-2 rounded-full border border-purple-100/80" />
            <div className="absolute inset-4 rounded-full border border-purple-100/50" />

            {/* Stationary Floating Dots */}
            <span className="absolute left-[15%] top-[16%] h-2 w-2 rounded-full bg-orange-400" />
            <span className="absolute bottom-[12%] left-[34%] h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="absolute right-[18%] top-[22%] h-2 w-2 rounded-full bg-amber-400" />

            {/* Central Phone Frame */}
            <div className="relative z-10 flex h-[62%] w-[38%] flex-col items-center rounded-[16px] bg-indigo-600 p-1.5 shadow-md">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[11px] bg-indigo-400/80">
                <div className="absolute -right-6 -top-6 h-28 w-16 rotate-45 bg-white/20" />
              </div>
              <div className="absolute top-1.5 h-1 w-4 rounded-full bg-indigo-800" />
            </div>

            {/* INFINITE REVOLVING ORBIT RING */}
            <div className="animate-orbit pointer-events-none absolute inset-0 z-20">

              {/* Envelope Icon (Top-Left Position) */}
              <div className="absolute left-[18%] top-[18%] -translate-x-1/2 -translate-y-1/2">
                <div className="animate-counter-rotate flex items-center justify-center rounded-lg border-2 border-red-500 bg-white p-1 shadow-md">
                  <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>

              {/* Badge 1 (Top-Right Position) */}
              <div className="absolute right-[18%] top-[18%] -translate-y-1/2 translate-x-1/2">
                <div className="animate-counter-rotate flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md">
                  1
                </div>
              </div>

              {/* Badge 2 (Bottom-Right Position) */}
              <div className="absolute bottom-[18%] right-[18%] translate-x-1/2 translate-y-1/2">
                <div className="animate-counter-rotate flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-md">
                  2
                </div>
              </div>

              {/* Badge 3 (Bottom-Left Position) */}
              <div className="absolute bottom-[18%] left-[18%] -translate-x-1/2 translate-y-1/2">
                <div className="animate-counter-rotate flex h-6 w-6 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white shadow-md">
                  3
                </div>
              </div>

            </div>
          </div>

          {/* Header Text */}
          <header className="max-w-xs space-y-1.5 text-center sm:max-w-sm">
            <h1 className="font-heading text-balance text-xl font-bold leading-tight tracking-tight text-gray-900 sm:text-2xl">
              Enter OTP
            </h1>
            <p className="text-pretty text-sm leading-relaxed text-gray-500">
              We have sent an OTP to <span className="break-all font-semibold text-gray-700">{email}</span> for verification
            </p>
          </header>

          {/* OTP Input Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-3 sm:space-y-4" noValidate>

            <div className="flex items-center justify-center gap-1.5 sm:gap-3">
              {otp.map((digit, index) => {
                const hasValue = digit !== '';
                return (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                    maxLength={1}
                    value={digit}
                    ref={(el) => (inputRefs.current[index] = el)}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    disabled={isLoading || isExpired}
                    className={`h-12 w-full min-w-0 max-w-[3rem] flex-1 rounded-lg border bg-white text-center font-heading text-xl font-bold tabular-nums text-indigo-600 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 sm:h-14 sm:max-w-[3.5rem] sm:text-2xl ${
                      hasValue
                        ? 'border-green-300 ring-green-100'
                        : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-200'
                    } ${isLoading || isExpired ? 'cursor-not-allowed opacity-50' : ''}`}
                  />
                );
              })}
            </div>

            <p
              className={`text-center text-sm font-medium tabular-nums ${isExpired ? 'text-red-600' : 'text-gray-500'}`}
              aria-live="polite"
            >
              {isExpired ? 'OTP expired. Request a new code below.' : `OTP expires in ${formattedTime}`}
            </p>

            <button
              type="submit"
              disabled={isLoading || isExpired || !isComplete}
              className={`flex min-h-12 w-full items-center justify-center rounded-xl py-3 text-sm font-semibold uppercase tracking-wider shadow-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
                isComplete && !isLoading && !isExpired
                  ? 'bg-green-300 text-gray-900 hover:bg-green-400 active:bg-green-500'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300'
              }`}
            >
              {isLoading ? 'VERIFYING...' : 'VERIFY OTP'}
            </button>
          </form>

          {/* Footer Link */}
          <footer className="flex w-full flex-col items-center border-t border-gray-100/50 pt-2 text-center">
            <p className="text-sm text-gray-500">
              Didn't Receive the OTP?
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || resendWaitSeconds > 0}
              className="min-h-11 rounded-md px-3 text-sm font-semibold tabular-nums text-indigo-600 transition-colors hover:text-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResending ? 'RESENDING...' : resendWaitSeconds > 0 ? `Resend in ${resendWaitSeconds}s` : 'Resend Code'}
            </button>
          </footer>

        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
