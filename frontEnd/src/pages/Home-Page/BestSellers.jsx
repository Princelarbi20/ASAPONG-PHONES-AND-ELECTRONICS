import React, { useCallback, useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { formatPrice } from '@/lib/utils';
import SectionTitle from '@/component/SectionTitle';

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""

// Custom scroll hiding fallback
const scrollbarStyle = `
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

// Faint per-card tints. Cards cycle through these; use a single entry for one uniform tint.
const CARD_TINTS = [
  { card: "bg-rose-50/60 border-rose-100/80 hover:border-rose-200 hover:shadow-rose-100/80", image: "bg-white/70" },
  { card: "bg-sky-50/60 border-sky-100/80 hover:border-sky-200 hover:shadow-sky-100/80", image: "bg-white/70" },
  { card: "bg-amber-50/60 border-amber-100/80 hover:border-amber-200 hover:shadow-amber-100/80", image: "bg-white/70" },
  { card: "bg-emerald-50/60 border-emerald-100/80 hover:border-emerald-200 hover:shadow-emerald-100/80", image: "bg-white/70" },
  { card: "bg-violet-50/60 border-violet-100/80 hover:border-violet-200 hover:shadow-violet-100/80", image: "bg-white/70" },
];

const BestSellers = ({ from, end, position }) => {
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${API_BASE}/api/v1/get-All-product`
      );

      let allProducts = [];
      if (data && Array.isArray(data.products)) {
        allProducts = data.products;
      } else if (Array.isArray(data)) {
        allProducts = data;
      }

      // Filter to return ONLY phone products
      const phoneProducts = allProducts.filter((product) => {
        const category = product.category?.toLowerCase() || "";
        const subcategory = product.subcategory?.toLowerCase() || "";
        return category.includes("phone") || subcategory.includes("phone");
      });

      // Apply pagination/slice parameters to the filtered phone list
      setNewArrivals(phoneProducts.slice(from, end));
    } catch (error) {
      console.log("Catalog API Fetch Failure:", error);
    } finally {
      setLoading(false);
    }
  }, [from, end]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Automated Infinite Swapping Loop every 3 seconds (pauses when user hovers mouse over slider)
  useEffect(() => {
    if (loading || newArrivals.length === 0 || isHovered) return;

    const interval = setInterval(() => {
      handleScroll("next");
    }, 3000);

    return () => clearInterval(interval);
  }, [loading, newArrivals, isHovered]);

  const handleScroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Determine target dimensions dynamically based on card widths
    const cardWidth = container.firstChild?.offsetWidth || 176;
    const gap = 16; // Equivalent to gap-4
    const scrollAmount = cardWidth + gap;

    if (direction === "next") {
      // Loop back smoothly to the beginning if end of line reached
      if (container.scrollLeft + container.offsetWidth >= container.scrollWidth - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    } else {
      // Loop to the end if reverse clicked at index zero
      if (container.scrollLeft <= 10) {
        container.scrollTo({ left: container.scrollWidth, behavior: "smooth" });
      } else {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      }
    }
  };

  const getSingleImageUrl = (imgStr) => {
    if (!imgStr) return 'https://placehold.co/600x400?text=No+Image';
    if (imgStr.startsWith('http')) return imgStr;
    return `${API_BASE}/${imgStr.replace(/\\/g, '/')}`;
  };

  return (
    <div className="w-full bg-slate-50 px-4 md:px-8 py-12 space-y-8 font-sans overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyle }} />

      {/* Section title: its style depends on where it sits on the page (or the `position` prop) */}
      <SectionTitle
        lead="Trending"
        accent="Phones"
        subtitle="Our current top-performing customer favorites"
        position={position}
      />

      {/* Main Display Wrap: Flanked by Direction Icons */}
      <div className="flex items-center gap-2 md:gap-4 w-full relative">

        {/* Reverse (Previous) Button */}
        {!loading && newArrivals.length > 0 && (
          <button
            onClick={() => handleScroll("prev")}
            className="p-2 rounded-full bg-red-100 border border-red-200 text-red-700 hover:bg-red-200 shadow-md active:scale-95 transition-all duration-200 cursor-pointer z-10 flex-shrink-0 hover:scale-110"
            aria-label="Previous items"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Product Carousel Grid Frame */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex overflow-x-auto no-scrollbar w-full gap-4 pb-4">
              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="bg-slate-100/80 border border-slate-200 rounded-2xl h-64 w-40 sm:w-44 lg:w-52 flex-shrink-0 animate-pulse"
                />
              ))}
            </div>
          ) : newArrivals.length > 0 ? (
            <div
              ref={scrollContainerRef}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="flex overflow-x-auto no-scrollbar w-full gap-4 pb-4 snap-x snap-mandatory scroll-smooth"
            >
              {newArrivals.map((product, index) => {
                const itemId = product._id || product.id;
                const isItemSoldOut = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= 5;
                const tint = CARD_TINTS[index % CARD_TINTS.length];

                const openProduct = () => {
                  navigate(`/product-details/${itemId}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                };

                return (
                  <div
                    key={itemId}
                    role="link"
                    tabIndex={0}
                    onClick={openProduct}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openProduct();
                      }
                    }}
                    className={`group relative flex w-40 sm:w-44 lg:w-52 flex-shrink-0 snap-start cursor-pointer flex-col justify-between overflow-hidden rounded-xl border p-2.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${tint.card}`}
                  >
                    {/* Image Box */}
                    <div className={`relative mb-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg p-3 ${tint.image}`}>
                      <img
                        src={getSingleImageUrl(product.images?.[0])}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className={`max-h-full max-w-full object-contain mix-blend-multiply drop-shadow-md transition-transform duration-500 group-hover:scale-110 ${isItemSoldOut ? 'opacity-50 grayscale' : ''}`}
                      />

                      {isItemSoldOut ? (
                        <span className="absolute left-2 top-2 rounded-md bg-red-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-md">
                          Sold Out
                        </span>
                      ) : (
                        <span className="absolute right-2 top-2 rounded-full border border-emerald-200 bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 shadow-sm backdrop-blur">
                          Hot
                        </span>
                      )}
                    </div>

                    {/* Text Context */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          {product.brand || "Phone"}
                        </span>
                        <h3 className="line-clamp-2 min-h-[2rem] text-xs font-semibold leading-snug text-slate-800 transition-colors duration-200 group-hover:text-rose-600">
                          {product.name}
                        </h3>
                        {isLowStock && (
                          <p className="mt-1 text-[10px] font-semibold text-amber-600">Only {product.stock} left</p>
                        )}
                      </div>

                      {/* Pricing Details */}
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-2">
                        <span className="text-sm font-bold text-slate-900">
                          {formatPrice(product.price)}
                        </span>
                        <span
                          aria-hidden="true"
                          className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-white transition-all duration-300 group-hover:bg-rose-600"
                        >
                          <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-sm text-slate-400 font-medium italic w-full border border-dashed border-slate-200 rounded-2xl bg-white">
              No trending phones found at this time.
            </div>
          )}
        </div>

        {/* Next Button */}
        {!loading && newArrivals.length > 0 && (
          <button
            onClick={() => handleScroll("next")}
            className="p-2 rounded-full bg-red-100 border border-red-200 text-red-700 hover:bg-red-200 shadow-md active:scale-95 transition-all duration-200 cursor-pointer z-10 flex-shrink-0 hover:scale-110"
            aria-label="Next items"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

      </div>
    </div>
  );
};

export default BestSellers;