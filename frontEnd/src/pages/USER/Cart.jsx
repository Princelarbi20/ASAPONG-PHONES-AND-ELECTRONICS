import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { formatPrice } from '../../lib/utils';
import { authAction } from '../../redux/store';

// Get backend base URL from Vite environment variables with a fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isAuthenticated = useSelector((state) => state.auth.isLogin);

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getSingleImageUrl = (imgStr) => {
    if (!imgStr) return 'https://placehold.co/150?text=No+Image';
    if (imgStr.startsWith('http')) return imgStr;
    const normalizedPath = imgStr.replace(/\\/g, '/');
    if (normalizedPath.startsWith('/uploads/')) {
      return `${API_BASE_URL}${normalizedPath}`;
    }
    return `${API_BASE_URL}/${normalizedPath.replace(/^\//, '')}`;
  };

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setErrorMsg('');

      const response = await axios.get(`${API_BASE_URL}/api/v1/cart`, {
        withCredentials: true
      });

      if (response.data && Array.isArray(response.data.cart)) {
        setCartItems(response.data.cart);
      } else if (response.data && Array.isArray(response.data.items)) {
        setCartItems(response.data.items);
      } else if (Array.isArray(response.data)) {
        setCartItems(response.data);
      } else {
        setCartItems([]);
      }
    } catch (err) {
      console.error("Failed to get your shopping cart items:", err);
      setErrorMsg(err.response?.data?.message || "Could not retrieve current cart items registry records.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const subtotal = cartItems.reduce((acc, item) => {
    const price = Math.round(Number(item?.productId?.price ?? item?.price) || 0);
    return acc + price * (item?.quantity || 1);
  }, 0);

  const shipping = subtotal > 500 || subtotal === 0 ? 0 : 15;
  const total = subtotal + shipping;

  // HANDLER: UPDATE ITEM QUANTITY COUNTER VIA BACKEND CALLS
  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;

    const updateToastId = toast.loading("Updating quantity...");
    try {
      const response = await axios.put(`${API_BASE_URL}/api/v1/update/${productId}`,
        { quantity: newQuantity },
        { withCredentials: true }
      );

      // 🚀 FIXED: Robust defensive parsing matching variations of Mongoose schema object maps
      setCartItems(prev => prev.map(item => {
        const currentId = item?.productId?._id || item?.productId?.id || item?._id || item?.id;
        return currentId === productId
          ? { ...item, quantity: newQuantity }
          : item;
      }));
      dispatch(authAction.setCart(response.data?.cart || cartItems));

      toast.success("Cart quantity updated!", { id: updateToastId });
    } catch (err) {
      console.error("Quantity update request failed:", err);
      toast.error(err.response?.data?.message || "Could not synchronize cart changes.", { id: updateToastId });
    }
  };

  // HANDLER: REMOVE ENTIRE ITEM NODE INDEX FROM REGISTRY PROFILE 
  const handleRemoveItem = async (productId) => {
    toast((t) => (
      <div className="flex flex-col gap-2.5">
        <p className="text-xs font-semibold text-gray-700">Remove this item from your cart?</p>
        <div className="flex gap-2 justify-end">
          <button
            className="px-2 py-1 text-[10px] border border-gray-200 rounded-md hover:bg-gray-50 text-gray-500 font-medium cursor-pointer"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancel
          </button>
          <button
            className="px-2.5 py-1 text-[10px] bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold cursor-pointer"
            onClick={async () => {
              toast.dismiss(t.id);
              const deleteToastId = toast.loading("Removing item...");
              try {
                const response = await axios.delete(`${API_BASE_URL}/api/v1/remove/${productId}`, {
                  withCredentials: true
                });

                // 🚀 FIXED: Balanced conditional mapping comparison criteria
                setCartItems(prev => prev.filter(item => {
                  const currentId = item?.productId?._id || item?.productId?.id || item?._id || item?.id;
                  return currentId !== productId;
                }));
                dispatch(authAction.setCart(response.data?.cart || []));

                toast.success("Item removed from cart.", { id: deleteToastId });
              } catch (err) {
                console.error("Cart item drop trace request failed:", err);
                toast.error(err.response?.data?.message || "Unable to drop specified item.", { id: deleteToastId });
              }
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    ), { duration: 2000 });
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Please sign in</h2>
        <p className="text-gray-500 mt-2 max-w-sm mx-auto">
          You need to be logged in to your account to view or manage your active shopping cart.
        </p>
        <Link to="/auth/login" className="inline-block mt-6 bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition shadow-sm">
          Sign In Now
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-24 gap-3">
        <Loader2 className="w-9 h-9 text-green-600 animate-spin" />
        <p className="text-xs text-gray-400 font-medium tracking-wide">Syncing your shopping cart data...</p>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Your cart is empty</h2>
        <p className="text-gray-500 mt-2">Looks like you haven't added any premium products or accessories profiles yet.</p>
        {errorMsg && <p className="text-xs text-rose-600 font-semibold mt-1 bg-rose-50 px-3 py-1.5 rounded-md inline-block">{errorMsg}</p>}
        <Link to="/" className="inline-flex items-center gap-2 mt-6 text-green-600 font-semibold hover:text-green-700 transition">
          <ArrowLeft className="w-4 h-4" /> Go back to shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-4">
          {cartItems.map((item) => {
            const product = item?.productId || {};
            // 🚀 FIXED: Secure fallback chain to capture identifier node indexes correctly
            const pId = product?._id || product?.id || item?._id || item?.id;

            return (
              <div
                key={pId}
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-20 h-20 bg-white rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 p-1.5">
                    <img
                      src={getSingleImageUrl(product?.images?.[0] || product?.image)}
                      alt={product?.name || "Product image"}
                      className="object-contain w-full h-full"
                      onError={(e) => { e.target.src = "https://placehold.co/150?text=No+Image"; }}
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-950 text-base line-clamp-1">{product?.name || 'Unknown Inventory Item'}</h3>
                    <p className="text-xs text-gray-400 font-medium capitalize">{product?.category || 'General'}</p>
                    <p className="text-sm font-semibold text-gray-900 sm:hidden">{formatPrice(product?.price || 0)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto sm:gap-8 border-t sm:border-none pt-3 sm:pt-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateQuantity(pId, (item?.quantity || 1) - 1)}
                      className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      disabled={(item?.quantity || 1) <= 1}
                    >
                      <Minus className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-gray-800">{item?.quantity || 1}</span>
                    <button
                      onClick={() => handleUpdateQuantity(pId, (item?.quantity || 1) + 1)}
                      className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </div>

                  <div className="hidden sm:block text-right min-w-20">
                    <span className="font-bold text-gray-900 text-base">{formatPrice(Math.round(Number(product?.price) || 0) * (item?.quantity || 1))}</span>
                  </div>

                  <button
                    onClick={() => handleRemoveItem(pId)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-4 bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-950 border-b border-gray-100 pb-3">Order Summary</h2>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Shipping</span>
              <span className="font-semibold text-gray-900">
                {shipping === 0 ? <span className="text-green-600 font-bold">FREE</span> : formatPrice(shipping)}
              </span>
            </div>
            {shipping > 0 && (
              <p className="text-[11px] text-gray-400 italic">Add {formatPrice(500 - subtotal)} more to unlock free shipping.</p>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4 flex justify-between items-baseline">
            <span className="text-base font-bold text-gray-950">Total Amount</span>
            <span className="text-2xl font-black text-green-600">{formatPrice(total)}</span>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg shadow-sm transition-colors cursor-pointer text-center block text-sm"
          >
            Proceed to Checkout
          </button>

          <Link to="/" className="block text-center text-xs font-semibold text-gray-400 hover:text-gray-600 transition pt-1">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
