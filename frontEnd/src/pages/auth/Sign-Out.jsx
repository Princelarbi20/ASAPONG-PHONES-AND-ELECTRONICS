import React from 'react';
import { LogOut } from 'lucide-react';
import { useDispatch } from 'react-redux';
import axiosInstance from '../../lib/axios';
import toast from 'react-hot-toast';
import { authAction } from '../../redux/store';

export const SignOut = () => {
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/user-log-out');
      dispatch(authAction.logout());
      window.location.assign(window.location.origin);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not sign out. Please try again.');
    }
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
