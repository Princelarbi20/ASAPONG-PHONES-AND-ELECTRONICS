import React, { useState, useEffect } from 'react';
import axiosInstance, { API_ORIGIN } from '../../lib/axios';
import { Loader2, AlertCircle } from 'lucide-react';
import UpdateOrder from './UpdateOrder';
import { formatPrice } from '@/lib/utils';
import PaginationControls from '@/component/PaginationControls';

const PAGE_SIZE = 20;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

  // GET ALL ORDERS
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const response = await axiosInstance.get('/get-all-orders', { params: { page, limit: PAGE_SIZE } });

      // 3. Destructure and evaluate response shapes cleanly
      if (response.data && Array.isArray(response.data.orders)) {
        setOrders(response.data.orders);
        setPagination(response.data.pagination || { total: response.data.totalOrders || response.data.orders.length, totalPages: 1 });
      } else if (Array.isArray(response.data)) {
        setOrders(response.data);
        setPagination({ total: response.data.length, totalPages: 1 });
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setErrorMsg(err.response?.data?.message || 'Access Denied: Unable to fetch order data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const changeStatusInState = (id, nextVal) => {
    setOrders(orders.map(o => (o._id || o.id) === id ? { ...o, status: nextVal } : o));
    if (selectedOrder && (selectedOrder._id || selectedOrder.id) === id) {
      setSelectedOrder({ ...selectedOrder, status: nextVal });
    }
  };

  const handleSelectOrder = async (order) => {
    const id = order._id || order.id;
    if (!id || detailsLoading) return;

    setDetailsLoading(true);
    setErrorMsg('');

    try {
      const response = await axiosInstance.get(`/get-order/${id}`);
      setSelectedOrder(response.data?.order || null);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setErrorMsg(err.response?.data?.message || 'Unable to fetch the selected order details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeOrderDetails = () => setSelectedOrder(null);

  const formatDate = (date) => date
    ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
    : 'Not available';

  const DetailRow = ({ label, value }) => (
    <div className="flex items-start justify-between gap-5 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="break-all text-right font-medium text-slate-900">{value || 'Not available'}</span>
    </div>
  );

  const getImageUrl = (src) => {
    if (!src) return 'https://placehold.co/120x120?text=No+Image';
    if (src.startsWith('http')) return src;
    const normalizedPath = src.replace(/\\/g, '/');
    if (normalizedPath.startsWith('/uploads/')) {
      return `${API_ORIGIN}${normalizedPath}`;
    }
    return `${API_ORIGIN}/${normalizedPath.replace(/^\//, '')}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Order Manifests</h2>

      {/* Error Alert Display */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 border border-red-200 text-sm font-medium text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0" />
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
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Total Price</th>
                <th className="px-6 py-4">Current Status</th>
                <th className="px-6 py-4 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400">No active client orders found.</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const id = order._id || order.id;

                  // Defensive checks for ID values to prevent crashes on substring reads
                  const displayId = id ? `#${id.substring(0, 8)}` : '#N/A';
                  const customer = order.customerName || order.user?.userName || order.user?.name || 'Guest Client';
                  const amount = order.totalPrice ?? order.totalAmount ?? order.price ?? 0;

                  return (
                    <tr
                      key={id || Math.random()}
                      className="cursor-pointer hover:bg-gray-50/50"
                      onClick={() => handleSelectOrder(order)}
                    >
                      <td className="px-6 py-4 font-mono font-medium text-indigo-600">{displayId}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{customer}</td>
                      <td className="px-6 py-4">{formatPrice(amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${['SHIPPED', 'DELIVERED', 'APPROVED'].includes((order.status || 'PENDING').toUpperCase())
                          ? 'bg-emerald-50 text-emerald-700'
                          : (order.status || 'PENDING').toUpperCase() === 'PENDING'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                          }`}>
                          {order.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                        <UpdateOrder
                          orderId={id}
                          currentStatus={order.status || 'PENDING'}
                          onStatusUpdated={changeStatusInState}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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

      {detailsLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="status" aria-label="Loading order details">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-5 text-sm font-medium text-slate-700 shadow-xl">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            Loading order details…
          </div>
        </div>
      )}

      {selectedOrder && !detailsLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 sm:p-6">
          <div className="w-full max-w-6xl overflow-y-auto rounded-[2rem] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.18)] border border-slate-200 sm:max-h-[calc(100vh-4rem)]">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-slate-900">Order #{selectedOrder._id?.slice(0, 8) || selectedOrder.id?.slice(0, 8)}</h3>
                <p className="text-sm text-slate-500">Placed {formatDate(selectedOrder.createdAt)}</p>
              </div>
              <button
                onClick={closeOrderDetails}
                className="h-11 w-11 rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 cursor-pointer"
                aria-label="Close order details"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.5fr_1fr]">
              <div className="space-y-5">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Customer</h4>
                  <p className="mt-4 text-lg font-semibold text-slate-900">{selectedOrder.user?.userName || selectedOrder.customerName || 'Guest Client'}</p>
                  <p className="text-sm text-slate-500">{selectedOrder.user?.email || selectedOrder.customerEmail || ''}</p>
                  <div className="mt-4 rounded-2xl bg-white px-4 py-2 shadow-sm">
                    <DetailRow label="Phone" value={selectedOrder.user?.phone} />
                    <DetailRow label="Fulfillment status" value={selectedOrder.status || 'PENDING'} />
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Shipping Address</h4>
                  <div className="mt-4 space-y-2 text-sm text-slate-700">
                    <DetailRow label="Address" value={selectedOrder.shippingAddress?.address} />
                    <DetailRow label="City / State" value={[selectedOrder.shippingAddress?.city, selectedOrder.shippingAddress?.state].filter(Boolean).join(', ')} />
                    <DetailRow label="Country" value={selectedOrder.shippingAddress?.country} />
                    <DetailRow label="Postal code" value={selectedOrder.shippingAddress?.postalCode} />
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Order Summary</h4>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <DetailRow label="Order ID" value={selectedOrder._id || selectedOrder.id} />
                    <DetailRow label="Items" value={String(selectedOrder.items?.length ?? 0)} />
                    <DetailRow label="Created" value={formatDate(selectedOrder.createdAt)} />
                    <DetailRow label="Last updated" value={formatDate(selectedOrder.updatedAt)} />
                    <div className="flex justify-between rounded-3xl border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                      <span>Total</span>
                      <span>{formatPrice(selectedOrder.totalPrice ?? selectedOrder.totalAmount ?? 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment Details</h4>
                  <div className="mt-4">
                    <DetailRow label="Payment status" value={selectedOrder.paymentStatus || 'PENDING'} />
                    <DetailRow label="Provider" value={selectedOrder.paymentDetails?.provider} />
                    <DetailRow label="Reference" value={selectedOrder.paymentDetails?.reference} />
                    <DetailRow label="Transaction ID" value={selectedOrder.paymentDetails?.transactionId} />
                    <DetailRow label="Method" value={selectedOrder.paymentDetails?.channel} />
                    <DetailRow label="Mobile money network" value={selectedOrder.paymentDetails?.serviceProvider} />
                    <DetailRow label="Gateway response" value={selectedOrder.paymentDetails?.gatewayResponse} />
                    <DetailRow label="Amount paid" value={selectedOrder.paymentDetails?.amount != null ? `${formatPrice(selectedOrder.paymentDetails.amount)} ${selectedOrder.paymentDetails.currency || ''}`.trim() : null} />
                    <DetailRow label="Paid at" value={selectedOrder.paymentDetails?.paidAt ? formatDate(selectedOrder.paymentDetails.paidAt) : null} />
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Items & Images</h4>
                  <div className="mt-4 space-y-4">
                    {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
                        <img
                          src={getImageUrl(item.image || item.productId?.images?.[0])}
                          alt={item.name || item.productId?.name || 'Product image'}
                          className="h-24 w-full rounded-3xl object-cover sm:w-24"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                          <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                          <p className="text-sm text-slate-500">Unit price: {formatPrice(item.price)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Line total</p>
                          <p className="text-base font-semibold text-slate-900">{formatPrice((item.price || 0) * (item.quantity || 1))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
