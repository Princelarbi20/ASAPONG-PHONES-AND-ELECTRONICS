import React, { useState } from 'react';
import axiosInstance from '../../lib/axios';
import { ShieldCheck } from 'lucide-react';

export default function UnsuspendUser({ userId, onUnsuspended }) {
  const [isUnsuspending, setIsUnsuspending] = useState(false);

  // UNSUSPEND METHOD PUT
  const handleUnsuspend = async () => {
    if (confirm('Are you sure you want to restore and unsuspend this user?')) {
      try {
        setIsUnsuspending(true);

        await axiosInstance.put(`/unsuspend-user/${userId}`);

        // 3. Update the frontend UI state layout
        onUnsuspended();
      } catch (err) {
        console.error('Axios error during user restoration:', err);
        alert(err.response?.data?.message || 'Failed to unsuspend user. Access Denied.');
      } finally {
        setIsUnsuspending(false);
      }
    }
  };

  return (
    <button
      onClick={handleUnsuspend}
      disabled={isUnsuspending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:bg-emerald-50 disabled:cursor-not-allowed"
    >
      <ShieldCheck className="w-3.5 h-3.5" />
      {isUnsuspending ? 'Restoring...' : 'Unsuspend'}
    </button>
  );
}