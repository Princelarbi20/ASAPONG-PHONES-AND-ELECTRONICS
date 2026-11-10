import React, { useState, useEffect } from 'react';
import axiosInstance from '../../lib/axios';

export const RegisteredShops = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchShops = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axiosInstance.get('/all-shops');
        const result = response.data;

        if (result.success && Array.isArray(result.shops)) {
          setShops(result.shops);
        } else {
          setError(result.message || 'Failed to fetch shops');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not connect to the server.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchShops();
  }, []);

  // Bulletproof Filter Engine matching frontend filter to uppercase DB values
  const filteredShops = shops.filter(shop => {
    if (!shop) return false;
    if (filter === 'all') return true;

    const shopStatus = shop.status || 'PENDING';
    return shopStatus.toString().toLowerCase() === filter.toLowerCase();
  });

  // Dynamic status badge styling helper
  const getBadgeStyles = (status) => {
    switch (status?.toString().toUpperCase()) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PENDING':
      default:
        return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading shops...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-center shadow-sm">
        <svg className="w-8 h-8 mx-auto mb-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="md:flex md:items-center md:justify-between border-b border-gray-200 pb-5 mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Registered Shops
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage, filter, and review vendor registration applications.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap gap-2 mb-8 no-scrollbar">
        {['all', 'pending', 'approved', 'rejected'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg border transition-all duration-200 shadow-sm ${filter === type
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            {type.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Grid Display */}
      {filteredShops.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-lg font-medium">
            No <span className="font-bold text-gray-700 capitalize">{filter !== 'all' && filter}</span> shops found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredShops.map((shop, index) => (
            <div
              key={shop._id || index}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
            >
              <div className="space-y-2 mb-4">
                <h3 className="text-lg font-bold text-gray-900 line-clamp-1">
                  {shop.shopName || 'Unnamed Shop'}
                </h3>
                <div className="text-sm text-gray-500 space-y-1">
                  <p className="truncate">
                    <span className="font-medium text-gray-700">Email:</span> {shop.email || 'N/A'}
                  </p>
                  <p className="truncate">
                    <span className="font-medium text-gray-700">Phone:</span> {shop.number || 'N/A'}
                  </p>
                  {shop.createdAt && (
                    <p className="text-xs text-gray-400">
                      Applied: {new Date(shop.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Dynamic Status Badge */}
              <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeStyles(shop.status)}`}>
                  {shop.status || 'PENDING'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
