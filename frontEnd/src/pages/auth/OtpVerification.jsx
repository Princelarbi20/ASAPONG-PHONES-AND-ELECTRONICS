import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../../lib/axios';
import toast from 'react-hot-toast';
import { withCsrf } from '../../lib/csrf';


const OtpVerification = () => {
  const OTP_LENGTH = 6;
  const OTP_EXPIRY_MS = 5 * 60 * 1000;
  const [otp, setOtp] = useState(new Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();

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
        toast.success('✓ Email verified successfully!');
        // Redirect to home page after 1.5 seconds
        setTimeout(() => {
          navigate('/');
        }, 1500);
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
    setIsResending(true);
    try {
      const config = await withCsrf({ withCredentials: true });
      const response = await axiosInstance.post('/resend-otp', { email }, config);
      
      toast.success('OTP has been resent to your email');
      setOtp(new Array(OTP_LENGTH).fill(''));
      setExpiresAt(Date.parse(response.data.otpExpiresAt) || Date.now() + OTP_EXPIRY_MS);
      setCurrentTime(Date.now());
      inputRefs.current[0]?.focus();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to resend OTP. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="h-screen w-full bg-transparent flex items-center justify-center p-0">
      
      {/* Embedded keyframe styles for smooth infinite rotation */}
      <style>{`
        @keyframes orbit {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes counter-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }
        .animate-orbit {
          animation: orbit 15s linear infinite;
        }
        .animate-counter-rotate {
          animation: counter-rotate 15s linear infinite;
        }
      `}</style>

      {/* Main Container */}
      <div className="w-full h-full flex flex-col justify-center items-center space-y-4 sm:space-y-6 overflow-hidden bg-white/10 border border-slate-200/20 p-6 shadow-lg backdrop-blur-sm">
        
        {/* Graphic Illustration */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 lg:w-60 lg:h-60 bg-purple-50/50 rounded-full flex items-center justify-center shrink-0">
          <div className="absolute inset-2 border border-purple-100/80 rounded-full" />
          <div className="absolute inset-5 border border-purple-100/50 rounded-full" />

          {/* Stationary Floating Dots */}
          <span className="absolute top-8 left-10 w-2 h-2 bg-orange-400 rounded-full" />
          <span className="absolute bottom-6 left-20 w-2.5 h-2.5 bg-amber-500 rounded-full" />
          <span className="absolute top-12 right-12 w-2 h-2 bg-amber-400 rounded-full" />

          {/* Central Phone Frame */}
          <div className="relative z-10 w-16 h-28 sm:w-20 sm:h-32 lg:w-24 lg:h-36 bg-indigo-600 rounded-[22px] p-1.5 shadow-md flex flex-col items-center">
            <div className="w-full h-full bg-indigo-400/80 rounded-[16px] relative overflow-hidden flex items-center justify-center">
              <div className="absolute -top-6 -right-6 w-16 h-28 bg-white/20 transform rotate-45" />
            </div>
            <div className="absolute top-2 w-5 h-1 bg-indigo-800 rounded-full" />
          </div>

          {/* ======================================================== */}
          {/* INFINITE REVOLVING ORBIT RING                            */}
          {/* ======================================================== */}
          <div className="absolute inset-0 z-20 animate-orbit pointer-events-none">
            
            {/* Envelope Icon (Top-Left Position) */}
            <div className="absolute top-[18%] left-[18%] -translate-x-1/2 -translate-y-1/2">
              <div className="animate-counter-rotate bg-white border-2 border-red-500 rounded-lg p-1 shadow-md flex items-center justify-center">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
            <div className="absolute top-[18%] right-[18%] translate-x-1/2 -translate-y-1/2">
              <div className="animate-counter-rotate w-6 h-6 sm:w-7 sm:h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                1
              </div>
            </div>

            {/* Badge 2 (Bottom-Right Position) */}
            <div className="absolute bottom-[18%] right-[18%] translate-x-1/2 translate-y-1/2">
              <div className="animate-counter-rotate w-6 h-6 sm:w-7 sm:h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                2
              </div>
            </div>

            {/* Badge 3 (Bottom-Left Position) */}
            <div className="absolute bottom-[18%] left-[18%] -translate-x-1/2 translate-y-1/2">
              <div className="animate-counter-rotate w-6 h-6 sm:w-7 sm:h-7 bg-cyan-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                3
              </div>
            </div>

          </div>
          {/* ======================================================== */}

        </div>

        {/* Header Text */}
        <div className="text-center space-y-1 shrink-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight leading-none">
            Enter OTP
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto">
            We have sent an OTP to <span className="font-semibold">{email}</span> for verification
          </p>
        </div>

        {/* OTP Input Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm sm:max-w-md space-y-5 px-4">
          
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {otp.map((digit, index) => {
              const hasValue = digit !== '';
              return (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  ref={(el) => (inputRefs.current[index] = el)}
                  onChange={(e) => handleChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={handlePaste}
                  disabled={isLoading || isExpired}
                  className={`w-10 h-12 sm:w-12 sm:h-14 border rounded-lg bg-white text-center text-indigo-600 font-bold text-xl sm:text-2xl focus:outline-none focus:ring-2 shadow-sm transition-colors duration-200 ${
                    hasValue
                      ? 'border-green-300 ring-green-100'
                      : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-200'
                  } ${isLoading || isExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              );
            })}
          </div>

          <p className={`text-center text-xs font-semibold ${isExpired ? 'text-red-600' : 'text-gray-500'}`} aria-live="polite">
            {isExpired ? 'OTP expired. Request a new code below.' : `OTP expires in ${formattedTime}`}
          </p>

          <button
            type="submit"
            disabled={isLoading || isExpired || !isComplete}
            className={`w-full py-3.5 font-semibold text-sm rounded-xl tracking-wider shadow-sm transition-colors duration-200 uppercase ${
              isComplete && !isLoading && !isExpired
                ? 'bg-green-300 hover:bg-green-400 text-gray-900'
                : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white'
            }`}
          >
            {isLoading ? 'VERIFYING...' : 'VERIFY OTP'}
          </button>
        </form>

        {/* Footer Link */}
        <div className="pt-2 border-t border-gray-100/50 text-center shrink-0 space-y-1">
          <p className="text-xs text-gray-500">
            Didn't Receive the OTP?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors disabled:opacity-50"
          >
            {isResending ? 'RESENDING...' : 'Resend Code'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default OtpVerification;
