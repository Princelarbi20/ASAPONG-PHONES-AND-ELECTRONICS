import React, { useState, useEffect } from 'react';
import axiosInstance from '../../lib/axios';
import { Loader2, AlertCircle, X, Shield, Calendar, Mail, User, Phone, LogIn } from 'lucide-react';
import SuspendUser from './SuspendUser';
import UnsuspendUser from './UnsuspendUser';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // GET ALL USERS WITH AUTHENTICATION
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const response = await axiosInstance.get('/get-all-users');

      if (response.data && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
      } else if (Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setErrorMsg(err.response?.data?.message || 'Access Denied: Unable to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const changeStatusInState = (id, newStatus) => {
    setUsers(users.map(u => (u._id || u.id) === id ? { ...u, status: newStatus } : u));
    if (selectedUser && (selectedUser._id || selectedUser.id) === id) {
      setSelectedUser({ ...selectedUser, status: newStatus });
    }
  };

  // Helper function to format dates uniformly
  const formatDate = (dateString) => {
    if (!dateString) return 'Never / Not Tracked';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">User Management</h2>

      {/* Error Alert Display */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 border border-red-200 text-sm font-medium text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-400">No users found.</td>
                </tr>
              ) : (
                users.map((user) => {
                  const id = user._id || user.id;
                  const displayName = user.userName || user.name || 'Unnamed User';

                  return (
                    <tr
                      key={id}
                      onClick={() => setSelectedUser(user)}
                      className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">{displayName}</td>
                      <td className="px-6 py-4 text-gray-500">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${user.status === 'Active' || !user.isSuspended ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                          {user.status || (user.isSuspended ? 'Suspended' : 'Active')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {(user.status === 'Active' || !user.isSuspended) ? (
                          <SuspendUser userId={id} onSuspended={() => changeStatusInState(id, 'Suspended')} />
                        ) : (
                          <UnsuspendUser userId={id} onUnsuspended={() => changeStatusInState(id, 'Active')} />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* USER DETAILS POPUP MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">

            {/* Close Button */}
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-6 border-b pb-2">User Profile Summary</h3>

            <div className="space-y-4">
              {/* Account Name */}
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase">Username</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedUser.userName || selectedUser.name || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Email Address */}
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase">Email Address</p>
                  <p className="text-sm text-gray-700 font-medium">{selectedUser.email}</p>
                </div>
              </div>

              {/* Contact Number */}
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase">Contact Number</p>
                  <p className="text-sm text-gray-700 font-medium">
                    {selectedUser.contact || selectedUser.phone || 'Not Provided'}
                  </p>
                </div>
              </div>

              {/* System Authorization Role */}
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase">System Clearance Role</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-xs tracking-wide">
                    {selectedUser.role || 'USER'}
                  </span>
                </div>
              </div>

              {/* Account Creation Time */}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase">Registration Date</p>
                  <p className="text-sm text-gray-700 font-medium">
                    {formatDate(selectedUser.createdAt)}
                  </p>
                </div>
              </div>

              {/* Last Login Time */}
              <div className="flex items-center gap-3">
                <LogIn className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase">Last Session Login</p>
                  <p className="text-sm text-gray-700 font-medium">
                    {formatDate(selectedUser.lastLogin)}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Close Button */}
            <button
              onClick={() => setSelectedUser(null)}
              className="mt-6 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg transition-colors text-sm"
            >
              Close Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}