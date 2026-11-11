import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Loader2, Calendar, Package, MapPin, CheckCircle, Clock, XCircle, CreditCard, RotateCcw } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import axiosInstance, { resolveApiAssetUrl } from '../../lib/axios';
import toast from 'react-hot-toast';
import { authAction } from '../../redux/store';

export const MyOrders = () => {
    // Read auth state out of Redux
    const isAuthenticated = useSelector((state) => state.auth.isLogin);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Component tracking states
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [payingId, setPayingId] = useState(null);
    const [payError, setPayError] = useState('');

    // URL parsing helper to match dynamic asset locations
    const getSingleImageUrl = (imgStr) => {
        if (!imgStr) return 'https://placehold.co/150?text=No+Image';
        return resolveApiAssetUrl(imgStr.replace(/\\/g, '/'));
    };

    // Fulfilment status colours
    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'DELIVERED':
            case 'CONFIRMED':
            case 'APPROVED':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'SHIPPED':
            case 'OUT FOR DELIVERY':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'PROCESSING':
            case 'PACKED':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'PENDING':
                return 'bg-gray-50 text-gray-600 border-gray-200';
            case 'CANCELLED':
            case 'RETURNED':
            case 'REFUNDED':
            case 'RETURN REQUESTED':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            default:
                return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    // Payment status colours
    const getPaymentColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'PAID':
                return 'text-emerald-700';
            case 'PENDING':
                return 'text-amber-600';
            case 'FAILED':
            case 'ABANDONED':
            case 'REVERSED':
                return 'text-rose-600';
            default:
                return 'text-gray-700';
        }
    };

    const getPaymentIcon = (status) => {
        switch (status?.toUpperCase()) {
            case 'PAID':
                return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'PENDING':
                return <Clock className="w-4 h-4 text-amber-500" />;
            default:
                return <XCircle className="w-4 h-4 text-rose-500" />;
        }
    };

    const getPaymentMethod = (order) => {
        const details = order.paymentDetails;
        if (order.paymentStatus === 'PAID' && details?.provider) {
            if (details.serviceProvider) return `${details.serviceProvider} Mobile Money (Paystack)`;
            return details.channel
                ? `${details.provider} (${details.channel.replace(/_/g, ' ')})`
                : details.provider;
        }
        return 'Paystack';
    };

    // FETCH ORDER HISTORY
    const fetchUserOrders = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            setLoading(true);
            setErrorMsg('');

            const response = await axiosInstance.get('/my-orders');

            if (response.data && Array.isArray(response.data.orders)) {
                setOrders(response.data.orders);
            } else {
                setOrders([]);
            }
        } catch (err) {
            console.error('Failed to fetch user orders:', err);
            setErrorMsg(err.response?.data?.message || 'Could not retrieve your orders.');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchUserOrders();
    }, [fetchUserOrders]);

    // PAY NOW: start a fresh Paystack transaction for an unpaid order
    const handlePayNow = async (orderId) => {
        if (payingId) return; // ignore repeat clicks
        try {
            setPayingId(orderId);
            setPayError('');

            const { data } = await axiosInstance.post('/payment/initialize', { orderId });

            const url = data?.data?.authorization_url;
            if (!url) throw new Error('No payment link was returned.');

            // Success redirects away, so the button stays disabled
            window.location.href = url;
        } catch (err) {
            setPayError(err.response?.data?.message || err.message || 'Could not start payment.');
            setPayingId(null);
        }
    };

    const handleBuyAgain = async (order) => {
        const items = (order.items || []).filter((item) => item.productId?._id || item.productId);
        if (!items.length) {
            toast.error('The products in this order are no longer available.');
            return;
        }

        const toastId = toast.loading('Adding order items to your cart...');
        let cart = [];
        try {
            for (const item of items) {
                const productId = item.productId?._id || item.productId;
                const { data } = await axiosInstance.post('/add-to-cart', {
                    productId,
                    quantity: item.quantity || 1,
                });
                cart = data?.cart || cart;
            }
            dispatch(authAction.setCart(cart));
            toast.success('Order items added to your cart.', { id: toastId });
            navigate('/cart');
        } catch (err) {
            if (cart.length) dispatch(authAction.setCart(cart));
            toast.error(err.response?.data?.message || 'Some items could not be added. Check product availability.', { id: toastId });
        }
    };

    // Guard: not logged in
    if (!isAuthenticated) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Please sign in</h2>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                    You need to be logged in to view your purchase history.
                </p>
                <Link to="/auth/login" className="inline-block mt-6 bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition shadow-sm">
                    Sign In Now
                </Link>
            </div>
        );
    }

    // Loading
    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center py-24 gap-3">
                <Loader2 className="w-9 h-9 text-green-600 animate-spin" />
                <p className="text-xs text-gray-400 font-medium tracking-wide">Loading your orders...</p>
            </div>
        );
    }

    // Fetch failed
    if (errorMsg) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
                <p className="text-sm text-rose-600 font-semibold mt-2">{errorMsg}</p>
                <button
                    onClick={fetchUserOrders}
                    className="mt-6 bg-slate-900 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-slate-800 transition"
                >
                    Try again
                </button>
            </div>
        );
    }

    // No orders
    if (orders.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">No Orders Placed Yet</h2>
                <p className="text-gray-500 mt-2">Looks like you haven't placed any orders yet.</p>
                <Link to="/" className="inline-flex items-center gap-2 mt-6 text-green-600 font-semibold hover:text-green-700 transition">
                    <ArrowLeft className="w-4 h-4" /> Discover Premium Gadgets
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div>
                <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Return to store shopping
                </Link>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-3">My Purchase Orders</h1>
            </div>

            {payError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium rounded-xl px-4 py-3">
                    {payError}
                </div>
            )}

            <div className="space-y-6">
                {orders.map((order) => (
                    <div key={order._id} className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden transition-all hover:shadow-md">

                        {/* Top order summary stripe */}
                        <div className="bg-gray-50/70 border-b border-gray-100 p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium text-gray-500">
                            <div>
                                <p className="uppercase text-[10px] tracking-wider text-gray-400 font-bold mb-1">Order Identifier</p>
                                <span className="font-mono text-gray-800 font-bold break-all">{order._id}</span>
                            </div>
                            <div>
                                <p className="uppercase text-[10px] tracking-wider text-gray-400 font-bold mb-1 flex items-center gap-1"><Calendar className="w-3 h-3 text-indigo-500" /> Purchase Date</p>
                                <span className="text-gray-700">{new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div>
                                <p className="uppercase text-[10px] tracking-wider text-gray-400 font-bold mb-1">Total Bill Invoice</p>
                                <span className="text-base font-black text-gray-950">{formatPrice(order.totalPrice || 0)}</span>
                            </div>
                            <div className="text-right sm:text-left self-center sm:self-auto">
                                <span className={`inline-block px-2.5 py-0.5 border text-[10px] font-extrabold rounded-md tracking-wider uppercase shadow-2xs ${getStatusColor(order.status)}`}>
                                    {order.status || 'PENDING'}
                                </span>
                            </div>
                        </div>

                        {/* Address and items */}
                        <div className="p-4 sm:p-6 space-y-6">

                            <div className="flex gap-2.5 text-xs text-gray-500 bg-slate-50/50 p-3 rounded-xl border border-gray-100 items-start">
                                <MapPin className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-gray-700 uppercase text-[9px] tracking-widest mb-0.5">Shipping Destination</p>
                                    <p>{order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.state}, {order.shippingAddress?.postalCode}, {order.shippingAddress?.country}</p>
                                </div>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {order.items?.map((item, index) => (
                                    <div key={item._id || index} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 sm:py-4 first:pt-0 last:pb-0 gap-2 sm:gap-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const productId = item.productId?._id || item.productId;
                                                if (productId) navigate(`/product-details/${productId}`);
                                            }}
                                            disabled={!item.productId?._id && !item.productId}
                                            className="flex min-w-0 items-center gap-3 text-left disabled:cursor-default sm:gap-4"
                                            aria-label={`View details for ${item.name}`}
                                        >
                                            <div className="w-14 h-14 bg-white border border-gray-100 rounded-xl overflow-hidden p-1 flex items-center justify-center shrink-0 shadow-2xs">
                                                <img
                                                    src={getSingleImageUrl(item.image || (item.productId && item.productId.images?.[0]))}
                                                    alt={item.name}
                                                    className="object-contain w-full h-full"
                                                    onError={(e) => { e.target.src = 'https://placehold.co/150?text=No+Image'; }}
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <h4 className="min-w-0 text-sm font-bold text-gray-950 line-clamp-2">{item.name}</h4>
                                                <p className="text-xs font-medium text-gray-400">Quantity: <span className="font-bold text-gray-600">{item.quantity}</span></p>
                                            </div>
                                        </button>
                                        <div className="hidden items-baseline justify-between gap-2 border-t border-dashed border-gray-100 pt-2 sm:flex sm:justify-start sm:border-none sm:pt-0 sm:text-right">
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 sm:hidden">Item Value</span>
                                            <span className="text-sm font-extrabold text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom payment stripe */}
                        <div className="bg-slate-50/40 px-4 sm:px-6 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-400 font-medium">
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                                <button
                                    type="button"
                                    onClick={() => handleBuyAgain(order)}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-white px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-50 transition"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" /> Buy Again
                                </button>
                                <span className="flex items-center gap-1.5">
                                    <CreditCard className="w-4 h-4 text-gray-400" />
                                    Payment Method:
                                    <span className="text-gray-700 font-bold capitalize">{getPaymentMethod(order)}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    {getPaymentIcon(order.paymentStatus)}
                                    Payment Status:
                                    <span className={`font-bold uppercase ${getPaymentColor(order.paymentStatus)}`}>
                                        {order.paymentStatus || 'PENDING'}
                                    </span>
                                </span>
                            </div>

                            {order.canPay && (
                                <button
                                    onClick={() => handlePayNow(order._id)}
                                    disabled={payingId !== null}
                                    className="inline-flex items-center justify-center gap-2 bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
                                >
                                    {payingId === order._id ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Redirecting...
                                        </>
                                    ) : (
                                        <>Pay Now</>
                                    )}
                                </button>
                            )}
                        </div>

                    </div>
                ))}
            </div>

        </div>
    );
};

export default MyOrders;
