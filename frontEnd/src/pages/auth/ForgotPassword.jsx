import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import axiosInstance from '../../lib/axios';
import { withCsrf } from '../../lib/csrf';
import ShopName from '@/component/ShopName';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail) || normalizedEmail.length > 254) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const config = await withCsrf({ withCredentials: true });
      const { data } = await axiosInstance.post('/forgot-password', { email: normalizedEmail }, config);
      if (!data?.success) {
        throw new Error(data?.message || 'We could not start the password reset. Please try again.');
      }
      const expiresAt = Date.parse(data?.flowExpiresAt);
      const validFlowId = typeof data?.flowId === 'string' && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(data.flowId);
      if (!validFlowId || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        throw new Error('The server did not return a valid reset reference. Please try again.');
      }
      navigate('/auth/verify-reset-otp', {
        replace: true,
        state: { email: normalizedEmail, flowId: data.flowId, flowExpiresAt: data.flowExpiresAt, confirmationMessage: data.message },
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not process your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-transparent">
      <div className="flex min-h-[100dvh] w-full items-center justify-center border border-slate-200/20 bg-white/10 px-4 py-8 shadow-lg backdrop-blur-sm sm:px-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="w-full max-w-sm space-y-5 sm:max-w-md sm:space-y-6">
          {/* Header */}
          <header className="text-center">
            <ShopName />
            <h1 className="text-xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-2xl">
              Forgot your password?
            </h1>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Reset your <span className="font-semibold text-indigo-600">Asapong</span> account password
            </p>
          </header>

          {/* Form */}
          <section>
            <p className="mb-4 text-center text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
              Enter your email. If the account is eligible, a code may be sent. Continue to the next step if you receive one.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setError(''); }}
                  disabled={isLoading}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'reset-email-error' : undefined}
                  className={`block min-h-11 w-full rounded-lg border bg-white/70 px-3.5 py-2.5 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm ${
                    error
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
                  }`}
                />
                {error && (
                  <p id="reset-email-error" className="mt-1.5 text-xs text-red-600 sm:text-sm" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading && <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" />}
                {isLoading ? 'Sending code…' : 'Send verification code'}
              </button>
            </form>
          </section>

          {/* Footer */}
          <footer className="border-t border-gray-100 pt-3 text-center">
            <Link
              to="/auth/login"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold text-indigo-600 transition-colors duration-200 hover:text-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ArrowLeft size={16} /> Back to sign in
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}