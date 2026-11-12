import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import axiosInstance from '../../lib/axios';
import { withCsrf } from '../../lib/csrf';
import ShopName from '@/component/ShopName';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;

export default function CreateNewPassword() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({ password: false, confirmation: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!state?.email || !state?.resetAuthorization) {
    return (
      <div className="h-[100dvh] w-full overflow-y-auto overscroll-contain bg-transparent">
        <div className="flex min-h-full w-full items-center justify-center border border-slate-200/20 bg-white/10 px-4 py-6 shadow-lg backdrop-blur-sm sm:px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
          <div className="w-full max-w-sm space-y-3 text-center sm:max-w-md">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50/80 text-indigo-600">
              <LockKeyhole size={20} />
            </div>
            <h1 className="text-xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-2xl">
              Verification required
            </h1>
            <p className="text-xs text-gray-500 sm:text-sm">
              Verify your email code before creating a new password.
            </p>
            <Link
              to="/auth/forgot-password"
              className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-semibold text-indigo-600 transition-colors duration-200 hover:text-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Start password reset
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    if (!passwordPattern.test(password)) { setError('Use at least 8 characters with uppercase, lowercase, a number, and a symbol.'); return; }
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      const config = await withCsrf({ withCredentials: true });
      await axiosInstance.post('/reset-password', { email: state.email, resetAuthorization: state.resetAuthorization, newPassword: password }, config);
      navigate('/auth/login', { replace: true, state: { passwordReset: true } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not reset your password. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="h-[100dvh] w-full overflow-y-auto overscroll-contain bg-transparent">
      <div className="flex min-h-full w-full items-center justify-center border border-slate-200/20 bg-white/10 px-4 py-6 shadow-lg backdrop-blur-sm sm:px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="w-full max-w-sm space-y-4 sm:max-w-md sm:space-y-5">

          {/* Header */}
          <header className="text-center">
            <ShopName />
            <h1 className="text-xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-2xl">
              Create a new password
            </h1>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Choose a strong password for your Asa Phones account.
            </p>
          </header>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4" noValidate>
            {[['new-password', 'New password', password, setPassword, 'password'], ['confirm-password', 'Confirm password', confirmation, setConfirmation, 'confirmation']].map(([id, label, value, setter, visibilityKey]) => (
              <div key={id}>
                <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
                <div className="relative">
                  <input
                    id={id}
                    type={visiblePasswords[visibilityKey] ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    maxLength={128}
                    value={value}
                    disabled={loading}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'reset-password-error' : undefined}
                    onChange={(event) => { setter(event.target.value); setError(''); }}
                    className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white/70 px-3.5 py-2.5 pr-12 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                    placeholder="Enter a secure password"
                  />
                  <button
                    type="button"
                    onClick={() => setVisiblePasswords((state) => ({ ...state, [visibilityKey]: !state[visibilityKey] }))}
                    aria-label={visiblePasswords[visibilityKey] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                    aria-pressed={visiblePasswords[visibilityKey]}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 transition-colors hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {visiblePasswords[visibilityKey] ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-slate-200/60 bg-white/50 p-3 text-xs leading-5 text-gray-600">
              <p className="font-semibold text-gray-700">Password requirements</p>
              <p>At least 8 characters, including uppercase and lowercase letters, a number, and a symbol.</p>
            </div>

            {error && (
              <p id="reset-password-error" className="text-xs text-red-600 sm:text-sm" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" />}
              {loading ? 'Updating password…' : 'Reset password'}
            </button>
          </form>

          {/* Footer */}
          <footer className="border-t border-gray-100 pt-2 text-center">
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