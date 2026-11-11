import React, { useState, useEffect } from 'react';
import axiosInstance from '../../lib/axios';
import { Loader2, AlertCircle, X, Shield, Calendar, Mail, User, Phone, LogIn, Search, ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import SuspendUser from './SuspendUser';
import UnsuspendUser from './UnsuspendUser';
import PaginationControls from '@/component/PaginationControls';

const PAGE_SIZE = 20;
const SortButton = ({ field, sort, onToggle, children }) => (
  <button type="button" onClick={() => onToggle(field)} className="inline-flex items-center gap-1 hover:text-indigo-600">
    {children}{sort.by === field ? (sort.order === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : null}
  </button>
);

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState({ by: 'date', order: 'desc' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchUsers = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const { data } = await axiosInstance.get('/get-all-users', {
          params: { page, limit: PAGE_SIZE, search, role, accountStatus, dateFrom, dateTo, sortBy: sort.by, sortOrder: sort.order },
          signal: controller.signal,
        });
        setUsers(Array.isArray(data.users) ? data.users : []);
        setPagination(data.pagination || { total: data.totalUsers || 0, totalPages: 1 });
      } catch (err) {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') setErrorMsg(err.response?.data?.message || 'Unable to fetch users.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchUsers();
    return () => controller.abort();
  }, [page, search, role, accountStatus, dateFrom, dateTo, sort, reloadKey]);

  const setFilter = (setter) => (event) => { setter(event.target.value); setPage(1); };
  const toggleSort = (by) => {
    setSort((current) => ({ by, order: current.by === by && current.order === 'asc' ? 'desc' : 'asc' }));
    setPage(1);
  };
  const clearFilters = () => {
    setSearchInput(''); setSearch(''); setRole(''); setAccountStatus(''); setDateFrom(''); setDateTo('');
    setSort({ by: 'date', order: 'desc' }); setPage(1);
  };
  const changeStatusInState = (id, newStatus) => {
    const isSuspended = newStatus === 'Suspended';
    setUsers(users.map(u => (u._id || u.id) === id ? { ...u, isSuspended, status: newStatus } : u));
    if (selectedUser && (selectedUser._id || selectedUser.id) === id) {
      setSelectedUser({ ...selectedUser, isSuspended, status: newStatus });
    }
    setReloadKey((current) => current + 1);
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
          <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="relative sm:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="Search name, email, phone, ID…" aria-label="Search users" className="min-h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm" />
            </label>
            <select value={role} onChange={setFilter(setRole)} aria-label="Filter user role" className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All roles</option>{['USER', 'ADMIN', 'DEALER'].map((value) => <option key={value}>{value}</option>)}</select>
            <select value={accountStatus} onChange={setFilter(setAccountStatus)} aria-label="Filter account status" className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All account statuses</option><option value="active">Active</option><option value="inactive">Inactive (suspended)</option></select>
            <label className="flex items-center gap-2 text-xs text-slate-500">From<input type="date" value={dateFrom} max={dateTo || undefined} onChange={setFilter(setDateFrom)} className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-sm" /></label>
            <label className="flex items-center gap-2 text-xs text-slate-500">To<input type="date" value={dateTo} min={dateFrom || undefined} onChange={setFilter(setDateTo)} className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-sm" /></label>
            <button type="button" onClick={clearFilters} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Clear filters</button>
            <p className="flex min-h-10 items-center text-sm text-slate-500" aria-live="polite">{pagination.total} matching users</p>
          </div>
          <div className="overflow-x-auto"><table className="admin-animated-table w-full min-w-[850px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4"><SortButton field="name" sort={sort} onToggle={toggleSort}>Username</SortButton></th>
                <th className="px-6 py-4"><SortButton field="email" sort={sort} onToggle={toggleSort}>Email Address</SortButton></th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4"><SortButton field="role" sort={sort} onToggle={toggleSort}>Role</SortButton></th>
                <th className="px-6 py-4"><SortButton field="status" sort={sort} onToggle={toggleSort}>Status</SortButton></th>
                <th className="px-6 py-4"><SortButton field="date" sort={sort} onToggle={toggleSort}>Registered</SortButton></th>
                <th className="px-6 py-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-400">No users match your search or filters. Try changing them or clear filters.</td>
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
                      <td className="px-6 py-4 text-gray-500">{user.phone || '—'}</td>
                      <td className="px-6 py-4">{user.role || 'USER'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${user.status === 'Active' || !user.isSuspended ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                          {user.status || (user.isSuspended ? 'Suspended' : 'Active')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
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
          <PaginationControls
            page={page}
            limit={PAGE_SIZE}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            loading={loading}
          />
        </div>
      )}

      {/* USER DETAILS POPUP MODAL */}
      {selectedUser && (
        <div className="admin-modal-backdrop fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="admin-modal-panel bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">

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
