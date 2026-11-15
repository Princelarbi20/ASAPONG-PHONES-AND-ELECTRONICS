import React, { useCallback, useEffect, useState, useRef } from "react";
import axios from "axios";
import { formatPrice } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""

const getSingleImageUrl = (imgStr) => {
  if (!imgStr) return 'https://placehold.co/600x400?text=No+Image';
  if (imgStr.startsWith('http')) return imgStr;
  return `${API_BASE}/${imgStr.replace(/\\/g, '/')}`;
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

// Headline copy per category. Unknown categories fall back to a generic headline.
// Pass `title` / `subtitle` props to <ProductList /> to override any of it.
const CATEGORY_COPY = {
  phones: { lead: "Find Your Next", accent: "Phone", sub: "Flagship power and everyday value, all in one place." },
  smartphones: { lead: "Find Your Next", accent: "Phone", sub: "Flagship power and everyday value, all in one place." },
  laptops: { lead: "Work, Create &", accent: "Play", sub: "Laptops built for performance, study and everything in between." },
  tablets: { lead: "Your Screen,", accent: "Anywhere", sub: "Light, fast tablets for work, play and everything between." },
  accessories: { lead: "Complete Your", accent: "Setup", sub: "Chargers, cases and the little extras that make a big difference." },
  headphones: { lead: "Hear Every", accent: "Detail", sub: "Immersive sound, from everyday earbuds to studio-grade headphones." },
  audio: { lead: "Hear Every", accent: "Detail", sub: "Immersive sound, from everyday earbuds to studio-grade headphones." },
  watches: { lead: "Smarter on Your", accent: "Wrist", sub: "Track, connect and stay on time in style." },
  smartwatches: { lead: "Smarter on Your", accent: "Wrist", sub: "Track, connect and stay on time in style." },
  wearables: { lead: "Smarter on Your", accent: "Wrist", sub: "Track, connect and stay on time in style." },
  gaming: { lead: "Level Up Your", accent: "Game", sub: "Gear that keeps up with every match, from casual to competitive." },
  tvs: { lead: "Big Screen,", accent: "Bigger Picture", sub: "Crisp, vivid TVs that turn any room into a cinema." },
  tv: { lead: "Big Screen,", accent: "Bigger Picture", sub: "Crisp, vivid TVs that turn any room into a cinema." },
  cameras: { lead: "Capture Every", accent: "Moment", sub: "Cameras that bring your best shots to life." },
};

const getCategoryCopy = (category, displayCategory) => {
  const known = CATEGORY_COPY[String(category || "").trim().toLowerCase()];
  if (known) return known;
  return {
    lead: "Shop the Best of",
    accent: displayCategory,
    sub: "Hand-picked products at prices you'll love.",
  };
};

// Title fonts (Google Fonts). If they can't load, the system sans-serif fallback is used.
const titleFontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800&family=Sora:wght@500;800&family=Playfair+Display:ital,wght@0,600;0,800;1,600;1,800&family=Space+Grotesk:wght@500;700&family=Outfit:wght@500;800&family=Manrope:wght@500;800&family=Syne:wght@500;800&family=Poppins:wght@500;800&display=swap');
  .pl-font-jakarta { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif; }
  .pl-font-sora { font-family: 'Sora', ui-sans-serif, system-ui, sans-serif; }
  .pl-font-playfair { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; }
  .pl-font-grotesk { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif; }
  .pl-font-outfit { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
  .pl-font-manrope { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; }
  .pl-font-syne { font-family: 'Syne', ui-sans-serif, system-ui, sans-serif; }
  .pl-font-poppins { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; }
`;

// Title styles: each one has its own font, colors, weight and accent bar.
// Full class strings are written out so Tailwind can detect them.
const TITLE_THEMES = [
  { // 0 - rose, clean sans
    font: "pl-font-jakarta",
    size: "text-3xl sm:text-4xl lg:text-5xl",
    heading: "font-extrabold tracking-tight",
    accent: "bg-gradient-to-r from-red-600 to-rose-500",
    accentExtra: "",
    band: "via-rose-100/60",
    bar: "h-1 w-12 rounded-full bg-gradient-to-r from-red-600 to-rose-400",
    button: "border-red-700 bg-red-600 hover:bg-red-700 focus:ring-red-300",
  },
  { // 1 - indigo to sky, geometric sans
    font: "pl-font-sora",
    size: "text-3xl sm:text-4xl lg:text-5xl",
    heading: "font-extrabold tracking-tight",
    accent: "bg-gradient-to-r from-indigo-600 to-sky-500",
    accentExtra: "",
    band: "via-indigo-100/60",
    bar: "h-1 w-16 rounded-full bg-gradient-to-r from-indigo-600 to-sky-400",
    button: "border-indigo-700 bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-300",
  },
  { // 2 - emerald, editorial serif
    font: "pl-font-playfair",
    size: "text-3xl sm:text-4xl lg:text-5xl",
    heading: "font-bold tracking-tight",
    accent: "bg-gradient-to-r from-emerald-600 to-teal-500",
    accentExtra: "italic",
    band: "via-emerald-100/60",
    bar: "h-px w-20 bg-gradient-to-r from-transparent via-emerald-600 to-transparent",
    button: "border-emerald-700 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300",
  },
  { // 3 - amber to orange, uppercase grotesk
    font: "pl-font-grotesk",
    size: "text-2xl sm:text-3xl lg:text-4xl",
    heading: "font-bold uppercase tracking-wide",
    accent: "bg-gradient-to-r from-amber-500 to-orange-600",
    accentExtra: "",
    band: "via-amber-100/70",
    bar: "h-1.5 w-10 rounded-sm bg-gradient-to-r from-amber-500 to-orange-600",
    button: "border-orange-700 bg-orange-600 hover:bg-orange-700 focus:ring-orange-300",
  },
  { // 4 - violet to fuchsia, rounded sans with italic accent
    font: "pl-font-outfit",
    size: "text-3xl sm:text-4xl lg:text-5xl",
    heading: "font-extrabold tracking-tighter",
    accent: "bg-gradient-to-r from-violet-600 to-fuchsia-500",
    accentExtra: "italic",
    band: "via-violet-100/60",
    bar: "h-1 w-14 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400",
    button: "border-violet-700 bg-violet-600 hover:bg-violet-700 focus:ring-violet-300",
  },
  { // 5 - cyan to blue, modern sans
    font: "pl-font-manrope",
    size: "text-3xl sm:text-4xl lg:text-5xl",
    heading: "font-extrabold tracking-tight",
    accent: "bg-gradient-to-r from-cyan-600 to-blue-500",
    accentExtra: "",
    band: "via-cyan-100/60",
    bar: "h-1 w-10 rounded-full bg-gradient-to-r from-cyan-600 to-blue-500",
    button: "border-cyan-700 bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-300",
  },
  { // 6 - graphite, bold display
    font: "pl-font-syne",
    size: "text-3xl sm:text-4xl lg:text-5xl",
    heading: "font-extrabold tracking-tight",
    accent: "bg-gradient-to-r from-slate-900 to-slate-500",
    accentExtra: "",
    band: "via-slate-200/70",
    bar: "h-1 w-12 rounded-full bg-slate-900",
    button: "border-slate-900 bg-slate-900 hover:bg-slate-700 focus:ring-slate-300",
  },
  { // 7 - pink to purple, friendly sans
    font: "pl-font-poppins",
    size: "text-3xl sm:text-4xl lg:text-5xl",
    heading: "font-extrabold tracking-tight",
    accent: "bg-gradient-to-r from-pink-600 to-purple-600",
    accentExtra: "",
    band: "via-pink-100/60",
    bar: "h-1 w-12 rounded-full bg-gradient-to-r from-pink-600 to-purple-500",
    button: "border-pink-700 bg-pink-600 hover:bg-pink-700 focus:ring-pink-300",
  },
];

// Known categories keep a fixed style. Any other category gets a stable style picked
// from its name, so it always looks the same (with more than 8 categories some will share one).
const CATEGORY_TITLE_THEME = {
  phones: 1, smartphones: 1,
  laptops: 6, computers: 6,
  tablets: 4,
  accessories: 5,
  headphones: 0, audio: 0, speakers: 0,
  watches: 3, smartwatches: 3, wearables: 3,
  gaming: 7, consoles: 7,
  tvs: 2, tv: 2, cameras: 2,
};

const getTitleTheme = (category) => {
  const key = String(category || "").trim().toLowerCase();
  if (key in CATEGORY_TITLE_THEME) return TITLE_THEMES[CATEGORY_TITLE_THEME[key]];

  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TITLE_THEMES[hash % TITLE_THEMES.length];
};

const ProductList = ({ category, linkTo, title, subtitle }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // "phones" -> "Phones" (only the first letter is changed, so "TVs" stays "TVs")
  const displayCategory = category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : "Catalog";

  const baseCopy = title
    ? { lead: title, accent: "", sub: "" }
    : getCategoryCopy(category, displayCategory);
  const copy = { ...baseCopy, sub: subtitle ?? baseCopy.sub };
  const theme = getTitleTheme(category);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/api/v1/get-All-product`);
      const allProducts = Array.isArray(data) ? data : (data.products || []);
      const filteredProducts = allProducts.filter((product) => product.category?.toLowerCase() === category?.toLowerCase());
      setProducts(filteredProducts.slice(0, 10));
    } catch (error) {
      console.error("Catalog API Fetch Failure:", error);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
      <style dangerouslySetInnerHTML={{ __html: titleFontStyle }} />

      {/* Section title: centered on a soft fading gradient; font and colors depend on the category */}
      <div className={`relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-transparent ${theme.band} to-transparent px-4 py-7 text-center md:py-10`}>
        <h2 className={`${theme.font} ${theme.size} ${theme.heading} leading-[1.1] text-slate-900`}>
          {copy.lead}
          {copy.accent && (
            <>
              {" "}
              <span className={`${theme.accent} ${theme.accentExtra} bg-clip-text pr-1 text-transparent`}>
                {copy.accent}
              </span>
            </>
          )}
        </h2>

        {copy.sub && (
          <p className={`${theme.font} mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-slate-500 md:text-base`}>
            {copy.sub}
          </p>
        )}

        <span aria-hidden="true" className={`mx-auto mt-5 block ${theme.bar}`} />

        {/* View All: under the title on smaller screens, pinned right on large screens */}
        <div className="mt-5 lg:absolute lg:right-6 lg:top-1/2 lg:mt-0 lg:-translate-y-1/2">
          <Link
            to={linkTo || `/catalog?category=${category?.toLowerCase()}`}
            aria-label={`View all ${displayCategory}`}
            className={`group inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 md:px-4 md:text-sm ${theme.button}`}
          >
            View All
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
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
    </div>
  );
};

export default ProductList;