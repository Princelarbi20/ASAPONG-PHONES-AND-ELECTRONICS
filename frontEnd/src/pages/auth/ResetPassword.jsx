import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { withCsrf } from '../../lib/csrf';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const ResetPassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Regex matching backend validation requirements
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('Choose a new password different from your current password.');
      return;
    }

    if (!passwordRegex.test(newPassword)) {
      toast.error('New password must be at least 8 characters and include uppercase, lowercase, number, and symbol.');
      return;
    }

    setIsLoading(true);
    try {
      const config = await withCsrf({ withCredentials: true });
      const response = await axios.put(
        `${API_BASE_URL}/api/v1/reset-password`,
        { currentPassword, newPassword },
        config
      );

      if (response.data.success) {
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
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isLoading}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Must be 8+ chars with uppercase, lowercase, number, and symbol (@$!%*?&#).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
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