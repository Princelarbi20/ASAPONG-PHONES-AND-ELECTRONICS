import React from 'react';
import { LogOut } from 'lucide-react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { authAction } from '../../redux/store'; // Verified path configuration matches your system imports

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const FRONTEND_ORIGIN = import.meta.env.VITE_FRONTEND_ORIGIN || 'http://localhost:5173';

export const SignOut = () => {
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/user-log-out`, {}, { withCredentials: true });
    } catch {
      // Clear local UI state even if the server session has already expired.
    } finally {
      dispatch(authAction.logout());
    }

    window.location.href = `${FRONTEND_ORIGIN}/`;
  };

  return (
    <div className="p-4 border-t border-slate-800 shrink-0 w-full bg-slate-900">
      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 select-none cursor-pointer"
        aria-label="Sign out of Admin Portal"
      >
        <LogOut className="w-5 h-5 shrink-0" />
        <span className="tracking-wide">Sign Out</span>
      </button>
    </div>
  );
};

export default SignOut;