import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../lib/axios';
import toast from 'react-hot-toast';
import { withCsrf } from '../../lib/csrf';
import { useDispatch } from 'react-redux';
import { authAction } from '../../redux/store';
import { Eye, EyeOff } from 'lucide-react';


const ResetPassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({ current: false, new: false, confirm: false });
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Regex matching backend validation requirements
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {};
    if (!currentPassword.trim()) nextErrors.currentPassword = 'Current password is required.';
    if (!newPassword) nextErrors.newPassword = 'New password is required.';
    else if (!passwordRegex.test(newPassword)) nextErrors.newPassword = 'Use at least 8 characters with upper and lowercase letters, a number, and a symbol.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Please confirm your new password.';
    else if (newPassword !== confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    if (currentPassword && newPassword && currentPassword === newPassword) nextErrors.newPassword = 'Choose a password different from your current one.';
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsLoading(true);
    try {
      const config = await withCsrf({ withCredentials: true });
      const response = await axiosInstance.put('/reset-password', { currentPassword, newPassword }, config);

      if (response.data.success) {
        dispatch(authAction.logout());
        toast.success(response.data.message || 'Password reset successfully!');
        setTimeout(() => {
          navigate('/auth/login');
        }, 1500);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to reset password. Please try again.';
      toast.error(errorMessage, {
        style: {
          border: '2px solid #ef4444',
          padding: '12px 16px',
          color: '#1f2937',
          fontWeight: '500',
          backgroundColor: '#fff',
        },
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-transparent flex items-center justify-center p-0">
      <div className="w-full max-w-md bg-white/10 border border-slate-200/20 p-8 shadow-lg backdrop-blur-sm rounded-2xl space-y-6">
        
        {/* Header Text */}
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
            Reset Password
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto">
            Please enter your current password and your new secure password below.
          </p>
        </div>

        {/* Reset Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Current Password
            </label>
            <div className="relative">
            <input
              type={visiblePasswords.current ? 'text' : 'password'}
              autoComplete="current-password"
              required
              maxLength={128}
              aria-invalid={Boolean(formErrors.currentPassword)}
              onBlur={() => { if (!currentPassword.trim()) setFormErrors((errors) => ({ ...errors, currentPassword: 'Current password is required.' })); }}
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setFormErrors((errors) => ({ ...errors, currentPassword: '' })); }}
              disabled={isLoading}
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <button type="button" onClick={() => setVisiblePasswords((state) => ({ ...state, current: !state.current }))} aria-label={visiblePasswords.current ? 'Hide current password' : 'Show current password'} aria-pressed={visiblePasswords.current} className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-slate-500 hover:text-indigo-600">{visiblePasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {formErrors.currentPassword && <p className="mt-1 text-xs text-red-600">{formErrors.currentPassword}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              New Password
            </label>
            <div className="relative">
            <input
              type={visiblePasswords.new ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              aria-invalid={Boolean(formErrors.newPassword)}
              onBlur={() => { if (newPassword && !passwordRegex.test(newPassword)) setFormErrors((errors) => ({ ...errors, newPassword: 'Password does not meet the requirements.' })); }}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setFormErrors((errors) => ({ ...errors, newPassword: '' })); }}
              disabled={isLoading}
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <button type="button" onClick={() => setVisiblePasswords((state) => ({ ...state, new: !state.new }))} aria-label={visiblePasswords.new ? 'Hide new password' : 'Show new password'} aria-pressed={visiblePasswords.new} className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-slate-500 hover:text-indigo-600">{visiblePasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {formErrors.newPassword && <p className="mt-1 text-xs text-red-600">{formErrors.newPassword}</p>}
            <p className="text-[10px] text-gray-500 mt-1">
              Use 8–128 characters with uppercase, lowercase, a number, and a symbol.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Confirm New Password
            </label>
            <div className="relative">
            <input
              type={visiblePasswords.confirm ? 'text' : 'password'}
              autoComplete="new-password"
              required
              maxLength={128}
              aria-invalid={Boolean(formErrors.confirmPassword)}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setFormErrors((errors) => ({ ...errors, confirmPassword: '' })); }}
              disabled={isLoading}
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <button type="button" onClick={() => setVisiblePasswords((state) => ({ ...state, confirm: !state.confirm }))} aria-label={visiblePasswords.confirm ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={visiblePasswords.confirm} className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-slate-500 hover:text-indigo-600">{visiblePasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {formErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{formErrors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 font-semibold text-sm rounded-xl tracking-wider shadow-sm transition-colors duration-200 uppercase bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white mt-2"
          >
            {isLoading ? 'UPDATING PASSWORD...' : 'RESET PASSWORD'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default ResetPassword;
