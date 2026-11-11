import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axiosInstance, { resolveApiAssetUrl } from '@/lib/axios';
import toast from 'react-hot-toast';
import { Loader2, AlertCircle, ArrowLeft, ShoppingCart, Heart, ShieldCheck, Truck, RotateCcw, Settings, Info, Sparkles, Star } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { authAction } from '../redux/store';

export default function ProductDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isLogin = useSelector((state) => state.auth.isLogin);

  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProductDataMatrix = async () => {
      try {
        setLoading(true);
        setErrorMsg('');

        const response = await axiosInstance.get('/get-All-product', {
          withCredentials: true
        });

        if (!isMounted) return;

        let productsList = [];
        if (response.data && Array.isArray(response.data.products)) {
          productsList = response.data.products;
        } else if (Array.isArray(response.data)) {
          productsList = response.data;
        }

        setAllProducts(productsList);

        const targetItem = productsList.find(p => String(p._id || p.id) === String(id));

        if (targetItem) {
          setProduct(targetItem);
          setActiveImageIndex(0);
          setQuantity(1);
        } else {
          setErrorMsg('The requested item could not be found inside active store registries.');
        }
      } catch (err) {
        console.error("Error retrieving detailed product node logs:", err);
        if (isMounted) {
          setErrorMsg(err.response?.data?.message || 'Unable to access specific product configurations matrix profiles.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchProductDataMatrix();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const getSingleImageUrl = (imgStr) => {
    if (!imgStr) return 'https://placehold.co/600x400?text=No+Image';
    if (typeof imgStr !== 'string') return 'https://placehold.co/600x400?text=No+Image';
    if (imgStr.startsWith('http') || imgStr.startsWith('data:')) return imgStr;
    return resolveApiAssetUrl(imgStr.replace(/\\/g, '/'));
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (!isLogin) {
      toast.error("Please log in to add items to your cart.");
      navigate('/auth/login');
      return;
    }

    try {
      const productId = product._id || product.id;

      const response = await axiosInstance.post('/add-to-cart',
        { productId, quantity },
        { withCredentials: true }
      );

      dispatch(authAction.setCart(response.data?.cart || []));
      toast.success(`${quantity} unit(s) of "${product.name}" added to your cart.`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Please log in to manage your cart items.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 gap-3">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-xs text-gray-400 font-medium tracking-wide">Retrieving asset data configurations sheets...</p>
      </div>
    );
  }

  if (errorMsg || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 border border-red-200 text-sm font-medium text-red-800 justify-center">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{errorMsg || 'Product record trace missing.'}</p>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:underline">
          <ArrowLeft className="w-4 h-4" /> Return to primary catalog rows
        </Link>
      </div>
    );
  }

  const isSoldOut = product.stock <= 0;

  // Filter recommendations based on matching category fields, excluding the actively active item profile index logs
  const relatedSuggestions = allProducts
    .filter(p => p.category === product.category && String(p._id || p.id) !== String(id))
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-14 pb-24 md:pb-10">

      {/* 1. MAIN UPPER DISPLAY BOX SPLIT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-start">

        {/* Left Side Gallery Display Window */}
        <div className="md:col-span-6 flex flex-col space-y-4 w-full h-full justify-start">
          <div className="w-full h-[320px] sm:h-[420px] md:h-[450px] max-h-[450px] bg-white border border-gray-100 rounded-2xl relative flex items-center justify-center p-6 shadow-sm overflow-hidden shrink-0">
            <img
              src={getSingleImageUrl(product.images?.[activeImageIndex])}
              alt={product.name}
              className={`max-w-full max-h-full object-contain transition duration-300 ${isSoldOut ? 'opacity-60' : ''}`}
            />
            {isSoldOut && (
              <span className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-md tracking-wider uppercase">
                Sold Out
              </span>
            )}
          </div>

          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 pt-1 select-none scrollbar-none items-center shrink-0 w-full">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 h-14 md:w-20 md:h-20 rounded-xl bg-white border-2 overflow-hidden flex items-center justify-center p-1.5 transition-all cursor-pointer shrink-0 ${idx === activeImageIndex ? 'border-indigo-600 shadow-sm scale-95' : 'border-gray-100 opacity-70 hover:opacity-100'
                    }`}
                >
                  <img src={getSingleImageUrl(img)} alt="Thumbnail index" className="max-w-full max-h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side Specifications Panel Card */}
        <div className="md:col-span-6 flex flex-col justify-between bg-white border border-gray-100 p-6 sm:p-8 rounded-2xl shadow-xs min-h-full">
          <div className="space-y-6">
            <div>
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[10px] uppercase tracking-widest border border-indigo-100">
                {product.category || 'General Electronics'}
              </span>
              <h1 className="text-xl sm:text-3xl font-black text-gray-950 mt-3 tracking-tight leading-tight">
                {product.name}
              </h1>
              <p className="text-xs text-gray-400 mt-1.5 font-medium">
                Brand Line Matrix: <span className="font-bold text-gray-700 uppercase">{product.brand || 'Generic'}</span>
              </p>

              {/* Star Rating Display */}
              <div className="flex items-center gap-1.5 mt-3">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.round(product.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-xs text-gray-500 font-medium">({(product.rating || 0).toFixed(1)})</span>
              </div>
            </div>

            <div className="border-y border-gray-100 py-4 bg-gray-50/50 px-4 rounded-xl border">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">MSRP Checkout Value</p>
                <p className="text-xl sm:text-3xl font-black text-red-600 mt-0.5">
                  {formatPrice(product.price)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Settings className="w-3.5 h-3.5 text-indigo-500" /> Technical Parameters
              </h2>
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-xs divide-y divide-gray-100 max-h-[180px] overflow-y-auto">
                {product.specifications && product.specifications.length > 0 ? (
                  product.specifications.map((spec, i) => (
                    <div key={i} className="grid grid-cols-3 p-2.5 text-xs hover:bg-slate-50/70 transition-colors gap-4">
                      <span className="font-bold text-gray-400 capitalize">{spec.key?.replace(/_/g, ' ')}</span>
                      <span className="col-span-2 font-semibold text-gray-700 whitespace-pre-line">{spec.value || 'N/A'}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs italic text-gray-400">No technical specs mapped.</div>
                )}
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS PANEL BAR */}
          <div className="fixed bottom-0 left-0 right-0 md:relative bg-white border-t md:border-t-0 border-gray-100 p-4 md:p-0 z-40 md:z-auto shadow-[0_-4px_12px_rgba(0,0,0,0.04)] md:shadow-none space-y-4 pt-2 mt-6">
            {!isSoldOut && (
              <div className="flex items-center justify-between md:justify-start gap-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Select Quantity:</span>
                <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden shadow-xs">
                  <button type="button" onClick={() => setQuantity(prev => Math.max(1, prev - 1))} className="px-3 py-1.5 hover:bg-gray-50 text-gray-600 transition font-bold text-sm cursor-pointer border-r border-gray-100">-</button>
                  <span className="w-10 text-center font-bold text-sm text-gray-800">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))} className="px-3 py-1.5 hover:bg-gray-50 text-gray-600 transition font-bold text-sm cursor-pointer border-l border-gray-100">+</button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isSoldOut}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-6 rounded-xl transition duration-200 shadow-sm flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer text-sm tracking-wide"
              >
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </button>

              <button
                type="button"
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`p-3 rounded-xl border flex items-center justify-center transition-colors duration-200 cursor-pointer ${isWishlisted ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm' : 'bg-white border-gray-200 text-gray-400 hover:text-rose-500 hover:bg-gray-50'
                  }`}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-600' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRODUCT DESCRIPTION EXPANDED SUMMARY OVERVIEW CARD */}
      <div className="space-y-3 w-full clear-both">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
          <Info className="w-4 h-4 text-indigo-500" /> Product Description
        </h2>
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs text-sm text-gray-600 leading-relaxed whitespace-pre-line w-full">
          {product.description || 'No specialized profile summary descriptions provided by catalog managers.'}
        </div>
      </div>

      {/* 3. DYNAMIC RECOMMENDED INVENTORY SECTION ("You May Like") */}
      {relatedSuggestions.length > 0 && (
        <div className="space-y-4 w-full pt-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
            <Sparkles className="w-4 h-4 text-red-500" /> You May Like
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {relatedSuggestions.map((item) => {
              const itemId = item._id || item.id;
              const isItemSoldOut = item.stock <= 0;
              return (
                <div
                  key={itemId}
                  onClick={() => {
                    navigate(`/product-details/${itemId}`);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white border border-gray-100 rounded-2xl p-3 md:p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer group relative overflow-hidden"
                >
                  {/* Image Grid Frame Box */}
                  <div className="w-full aspect-square bg-slate-50 rounded-xl flex items-center justify-center p-3 relative overflow-hidden mb-3 mix-blend-multiply">
                    <img
                      src={getSingleImageUrl(item.images?.[0])}
                      alt={item.name}
                      className="max-w-full max-h-full object-contain transform group-hover:scale-105 transition duration-500"
                    />
                    {isItemSoldOut && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-md tracking-wider uppercase">Sold Out</span>
                      </div>
                    )}
                  </div>

                  {/* Text Details Area */}
                  <div className="space-y-1 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block truncate">
                        {item.brand || "Brand"}
                      </span>
                      <h3 className="text-xs md:text-sm font-bold text-gray-800 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {item.name}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-slate-50 mt-2 flex items-center justify-between">
                      <span className="text-xs md:text-base font-black text-red-600">
                        {formatPrice(item.price)}
                      </span>
                      <span className="text-[9px] text-indigo-600 bg-indigo-50 font-bold px-1.5 py-0.5 rounded uppercase">
                        View
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trust badging grid layout block rows */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-gray-500 font-medium">
        <div className="flex items-center gap-2 bg-slate-50/50 border border-gray-100 p-2.5 rounded-xl"><Truck className="w-4 h-4 text-indigo-500 shrink-0" /><span>Free Shipping over <span className="text-red-600">GH₵ </span><span className="text-black">500</span></span></div>
        <div className="flex items-center gap-2 bg-slate-50/50 border border-gray-100 p-2.5 rounded-xl"><RotateCcw className="w-4 h-4 text-emerald-500 shrink-0" /><span>Hassle-free 14 Day Returns</span></div>
        <div className="flex items-center gap-2 bg-slate-50/50 border border-gray-100 p-2.5 rounded-xl"><ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" /><span>Fully Verified Authentic</span></div>
      </div>

    </div>
  );
}
