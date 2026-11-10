import React, { useCallback, useEffect, useState, useRef } from "react";
import Title from "@/component/Title";
import axiosInstance, { API_ORIGIN } from "@/lib/axios";
import PaginationControls from "@/component/PaginationControls";
import { formatPrice } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 10;

const getSingleImageUrl = (imgStr) => {
  if (!imgStr) return 'https://placehold.co/600x400?text=No+Image';
  if (imgStr.startsWith('http')) return imgStr;
  const normalizedPath = imgStr.replace(/\\/g, '/');
  if (normalizedPath.startsWith('/uploads/')) {
    return `${API_ORIGIN}${normalizedPath}`;
  }
  return `${API_ORIGIN}/${normalizedPath.replace(/^\//, '')}`;
};

// Inner Staggered Image Slider Component for Card Images
const ProductCardImage = ({ images, name, isItemSoldOut, index }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1 || isItemSoldOut) return;

    const staggerOffsetTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 3000);

      return () => clearInterval(interval);
    }, (index % 4) * 450 + Math.random() * 200);

    return () => clearTimeout(staggerOffsetTimeout);
  }, [images, isItemSoldOut, index]);

  return (
    <div className="w-full aspect-[4/3] bg-slate-50/60 rounded-lg relative overflow-hidden mb-2.5">
      <div
        className="h-full flex transition-transform duration-700 ease-in-out"
        style={{
          width: `${(images?.length || 1) * 100}%`,
          transform: `translateX(-${(currentIndex * 100) / (images?.length || 1)}%)`
        }}
      >
        {images && images.length > 0 ? (
          images.map((img, i) => (
            <div key={i} className="h-full flex items-center justify-center p-1.5" style={{ width: `${100 / images.length}%` }}>
              <img src={getSingleImageUrl(img)} alt={`${name} view ${i + 1}`} className={`max-w-full max-h-full object-contain pointer-events-none ${isItemSoldOut ? 'opacity-60' : ''}`} />
            </div>
          ))
        ) : (
          <div className="w-full h-full flex items-center justify-center p-1.5">
            <img src={getSingleImageUrl(null)} alt={name} className={`max-w-full max-h-full object-contain ${isItemSoldOut ? 'opacity-60' : ''}`} />
          </div>
        )}
      </div>

      {!isItemSoldOut && images && images.length > 1 && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10 bg-slate-900/10 backdrop-blur-xs px-1.5 py-0.5 rounded-full">
          {images.map((_, idx) => (
            <span key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-2 bg-rose-600' : 'w-1 bg-slate-400/60'}`} />
          ))}
        </div>
      )}

      {isItemSoldOut && (
        <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-md tracking-wider uppercase z-10">
          Sold Out
        </span>
      )}
    </div>
  );
};

const ProductList = ({ category, linkTo }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/get-All-product', {
        params: { category, page, limit: PAGE_SIZE },
      });
      setProducts(data.products || []);
      setPagination(data.pagination || { total: data.products?.length || 0, totalPages: 1 });
    } catch (error) {
      console.error("Catalog API Fetch Failure:", error);
    } finally {
      setLoading(false);
    }
  }, [category, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const lastPage = Math.max(1, pagination.totalPages);
    if (page > lastPage) setPage(lastPage);
  }, [page, pagination.totalPages]);

  // Container Level: Auto Scroll/Slide row layout every 3 seconds (Only active on desktop/tablet scroll view)
  useEffect(() => {
    if (loading || products.length <= 1 || isHovered || window.innerWidth < 640) return;

    const autoScrollInterval = setInterval(() => {
      handleScroll('next');
    }, 3000);

    return () => clearInterval(autoScrollInterval);
  }, [loading, products, isHovered]);

  const handleScroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cardElement = container.firstChild;
    if (!cardElement) return;

    const scrollAmount = cardElement.getBoundingClientRect().width + 16; // card width + flex gap

    if (direction === "next") {
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    } else {
      if (container.scrollLeft <= 10) {
        container.scrollTo({ left: container.scrollWidth, behavior: "smooth" });
      } else {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      }
    }
  };

  return (
    <div className="w-full bg-slate-50 px-3 sm:px-6 py-8 font-sans overflow-hidden">
      {/* Optimized Header Area */}
      <div className="mb-6 border-b border-slate-200 pb-3 flex justify-between items-end">
        <div>
          <Title
            text1={category?.toUpperCase() || "CATALOG"}
            text2="COLLECTION"
            className="justify-start text-left gap-1.5 tracking-tight text-xl md:text-2xl"
            text1className="text-slate-900 font-extrabold"
            text2className="font-light text-rose-600 uppercase tracking-widest text-lg md:text-xl"
          />
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium tracking-wide">
            Showing {pagination.total ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total} items in {category}
          </p>
        </div>

        <div className="shrink-0">
          <Link
            to={linkTo || `/catalog?category=${category?.toLowerCase()}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-700 bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
          >
            View All
            <span className="transform group-hover:translate-x-0.5 transition-transform duration-200">→</span>
          </Link>
        </div>
      </div>

      <div className="relative flex items-center group/nav">
        {/* Left Scroll Button (Hidden on small mobile grid screens) */}
        {!loading && products.length > 0 && (
          <button onClick={() => handleScroll('prev')} className="hidden sm:flex absolute left-0 z-20 p-2 rounded-full bg-red-100 border-red-200 text-red-700 hover:bg-red-200 shadow-md transition-all opacity-0 group-hover/nav:opacity-100 -translate-x-2 disabled:opacity-0 hover:scale-110 active:scale-95 items-center justify-center" aria-label="Scroll left">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Responsive Container: 2-Column Grid on Mobile (<640px), Horizontal Scroll Strip on Tablet/Desktop (≥640px) */}
        {loading ? (
          <div className="grid grid-cols-2 sm:flex gap-4 overflow-x-hidden pb-4 w-full">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="bg-slate-100/80 border border-slate-200 rounded-xl h-64 w-full sm:w-[200px] shrink-0 animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div
            ref={scrollContainerRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="grid grid-cols-2 sm:flex gap-4 sm:overflow-x-auto pb-4 scrollbar-none sm:snap-x sm:snap-mandatory scroll-smooth w-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {products.map((item, index) => {
              const itemId = item._id || item.id;
              const isItemSoldOut = item.stock <= 0;
              return (
                <div
                  key={itemId}
                  onClick={() => navigate(`/product-details/${itemId}`)}
                  // w-full inside grid-cols-2 ensures 2 items per row on mobile, fixed widths apply on sm+ scroll strip
                  className="bg-white border border-slate-200/60 rounded-xl p-2.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group relative overflow-hidden w-full sm:w-[190px] md:w-[210px] shrink-0 sm:snap-start"
                >
                  <ProductCardImage images={item.images} name={item.name} isItemSoldOut={isItemSoldOut} index={index} />

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{item.brand || category}</span>
                      <h3 className="text-[12px] font-medium text-slate-700 line-clamp-2 group-hover:text-rose-600 transition-colors duration-200 leading-tight min-h-[2rem]">{item.name}</h3>
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-100/80 flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">{formatPrice(item.price)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-slate-400 font-medium italic bg-white border border-dashed border-slate-200 rounded-xl w-full col-span-2">
            No products found in the {category} category.
          </div>
        )}

        {/* Right Scroll Button (Hidden on small mobile grid screens) */}
        {!loading && products.length > 0 && (
          <button onClick={() => handleScroll('next')} className="hidden sm:flex absolute right-0 z-20 p-2 rounded-full bg-red-100 border-red-200 text-red-700 hover:bg-red-200 shadow-md transition-all opacity-0 group-hover/nav:opacity-100 translate-x-2 disabled:opacity-0 hover:scale-110 active:scale-95 items-center justify-center" aria-label="Scroll right">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
      {!loading && pagination.totalPages > 1 && (
        <div className="mx-auto mt-4 max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white">
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
    </div>
  );
};

export default ProductList;
