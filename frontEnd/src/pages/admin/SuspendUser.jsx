import React, { useState } from 'react';
import axiosInstance from '../../lib/axios';
import { ShieldAlert } from 'lucide-react';

export default function SuspendUser({ userId, onSuspended }) {
  const [isSuspending, setIsSuspending] = useState(false);

  // SUSPEND METHOD PUT
  const handleSuspend = async () => {
    if (confirm('Are you sure you want to suspend this user?')) {
      try {
        setIsSuspending(true);

        await axiosInstance.put(`/suspend-user/${userId}`);

        // 3. Trigger parent state update callback on success
        onSuspended();
      } catch (err) {
        console.error('Axios error during user suspension:', err);
        alert(err.response?.data?.message || 'Failed to suspend user. Access Denied.');
      } finally {
        setIsSuspending(false);
      }
    }
  };

  return (
    <button
      onClick={handleSuspend}
      disabled={isSuspending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:bg-rose-50 disabled:cursor-not-allowed"
    >
      <ShieldAlert className="w-3.5 h-3.5" />
      {isSuspending ? 'Suspending...' : 'Suspend'}
    </button>
  );
}