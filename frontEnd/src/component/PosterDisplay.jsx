import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/component/Button'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

/* ---------- category helpers ---------- */

const normalize = (value) => String(value || '').trim().toLowerCase();

// product.category can be a plain string or a populated object ({ name })
const getCategoryName = (category) => {
  if (!category) return '';
  if (typeof category === 'string') return category;
  return category.name || category.title || '';
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""

const matchesCategory = (product, category) => {
  const wanted = normalize(category);
  if (!wanted || wanted === 'all') return true;
  return normalize(getCategoryName(product.category)) === wanted;
};

// Full class strings are written out so Tailwind can detect them.
const CATEGORY_THEMES = [
  { // 0 - blue
    bg: 'bg-gradient-to-br from-[#14264f] via-[#25427f] to-[#1a3068]',
    glow: 'bg-sky-300/20',
    accent: 'text-sky-200',
  },
  { // 1 - graphite
    bg: 'bg-gradient-to-br from-[#111827] via-[#2f3b52] to-[#1b2436]',
    glow: 'bg-slate-300/20',
    accent: 'text-slate-300',
  },
  { // 2 - violet
    bg: 'bg-gradient-to-br from-[#2a1450] via-[#4c2a8c] to-[#2b1766]',
    glow: 'bg-violet-300/25',
    accent: 'text-violet-200',
  },
  { // 3 - teal
    bg: 'bg-gradient-to-br from-[#062f3d] via-[#0e6479] to-[#093e50]',
    glow: 'bg-cyan-300/20',
    accent: 'text-cyan-200',
  },
  { // 4 - crimson
    bg: 'bg-gradient-to-br from-[#4a0f1a] via-[#8a1f33] to-[#5a1222]',
    glow: 'bg-rose-300/20',
    accent: 'text-rose-200',
  },
  { // 5 - amber
    bg: 'bg-gradient-to-br from-[#4a2406] via-[#9a4a10] to-[#5e2c08]',
    glow: 'bg-amber-300/25',
    accent: 'text-amber-200',
  },
  { // 6 - emerald
    bg: 'bg-gradient-to-br from-[#06302a] via-[#0f5f4f] to-[#0a3d35]',
    glow: 'bg-emerald-300/20',
    accent: 'text-emerald-200',
  },
  { // 7 - magenta
    bg: 'bg-gradient-to-br from-[#3b0f3f] via-[#7a2470] to-[#4a1448]',
    glow: 'bg-pink-300/20',
    accent: 'text-pink-200',
  },
];

// Known categories get a fixed theme. Anything else gets a stable theme
// picked from its name, so a new category always looks different from the others.
const CATEGORY_THEME_INDEX = {
  phones: 0, phone: 0, smartphones: 0,
  laptops: 1, laptop: 1, computers: 1,
  tablets: 2, tablet: 2,
  accessories: 3,
  headphones: 4, audio: 4, speakers: 4,
  watches: 5, smartwatches: 5, wearables: 5,
  gaming: 6, consoles: 6,
  tvs: 7, tv: 7, cameras: 7,
};

const getCategoryTheme = (category) => {
  const key = normalize(category);
  if (!key || key === 'all') return CATEGORY_THEMES[0];
  if (key in CATEGORY_THEME_INDEX) return CATEGORY_THEMES[CATEGORY_THEME_INDEX[key]];

  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return CATEGORY_THEMES[hash % CATEGORY_THEMES.length];
};

/* ---------- component ---------- */

// Usage: <PosterDisplay category="Phones" />   (no category = show everything)
const PosterDisplay = ({ category = '' }) => {
  const navigate = useNavigate()
  const [devices, setDevices] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const fallbackMockData = useMemo(() => [
    {
      _id: "iphone-15-pro-max",
      name: "iPhone 15 Pro Max",
      brand: "Apple",
      price: 24500,
      stock: 14,
      category: "Phones",
      description: "Premium titanium flagship smartphone engineering.",
      images: ['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80'],
      specifications: [
        { key: "chipset", value: "Apple A17 Pro (3 nm)" },
        { key: "os", value: "iOS 17" },
        { key: "RAM", value: "8GB" },
        { key: "Storage Capacity", value: "256GB" },
        { key: "Screen Size", value: "6.7-inch" }
      ]
    },
    {
      _id: "galaxy-s24-ultra",
      name: "Galaxy S24 Ultra",
      brand: "Samsung",
      price: 22999,
      stock: 8,
      category: "Phones",
      description: "Galaxy AI integrated ultra-tier productivity machine.",
      images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80'],
      specifications: [
        { key: "chipset", value: "Snapdragon 8 Gen 3 (4 nm)" },
        { key: "os", value: "Android 14, One UI 6.1" },
        { key: "RAM", value: "12GB" },
        { key: "Storage Capacity", value: "256GB" },
        { key: "Screen Size", value: "6.8-inch" }
      ]
    }
  ], []);

  useEffect(() => {
    const fetchDeviceData = async () => {
      try {
        setLoading(true);
        setCurrentIndex(0);

        // Fixed: Use API_BASE instead of hardcoded localhost
        const response = await axios.get(`${API_BASE}/api/v1/get-All-product`);

        let rawProductsList = [];
        if (response.data && Array.isArray(response.data.products)) {
          rawProductsList = response.data.products;
        } else if (Array.isArray(response.data)) {
          rawProductsList = response.data;
        }

        if (rawProductsList.length > 0) {
          // Only this category's products
          setDevices(rawProductsList.filter((p) => matchesCategory(p, category)));
        } else {
          setDevices(fallbackMockData.filter((p) => matchesCategory(p, category)));
        }
      } catch (error) {
        console.error("API catalog endpoint fetch failed, loading fallback products:", error);
        setDevices(fallbackMockData.filter((p) => matchesCategory(p, category)));
      } finally {
        setLoading(false);
      }
    };
    fetchDeviceData();
  }, [fallbackMockData, category]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === devices.length - 1 ? 0 : prev + 1));
  }, [devices.length]);

  // Auto-advance. Depends on currentIndex so clicking a dot restarts the 5s timer.
  useEffect(() => {
    if (devices.length < 2) return;
    const sliderTimer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(sliderTimer);
  }, [devices.length, nextSlide, currentIndex]);

  const getSingleImageUrl = (imgStr) => {
    if (!imgStr) return 'https://placehold.co/600x400?text=No+Image';
    if (imgStr.startsWith('http')) return imgStr;
    // Fixed: Use API_BASE template literal
    return `${API_BASE}/${imgStr.replace(/\\/g, '/')}`;
  };

  const navigateToProductDetails = (device) => {
    if (!device) return;
    const targetId = device._id || device.id;
    navigate(`/product-details/${targetId}`);
  };

  // Maps the different key names your database may use onto ram / storage / display
  const getSpecValueByKey = (device, keyName) => {
    if (!device || !device.specifications) return '';

    const searchKey = keyName.toLowerCase();

    const match = device.specifications.find(s => {
      const currentKey = s.key?.toLowerCase() || '';

      if (searchKey === 'storage') {
        return currentKey === 'storage' || currentKey === 'storage capacity' || currentKey === 'memory';
      }
      if (searchKey === 'display') {
        return currentKey === 'display' || currentKey === 'screen size';
      }
      return currentKey === searchKey;
    });

    return match ? match.value : '';
  };

  const visibleDots = devices.slice(0, 8);
  const theme = getCategoryTheme(category);

  return (
    <div className={`relative w-full max-w-full h-[30vh] min-h-[220px] md:h-[45vh] lg:h-[60vh] overflow-hidden ${theme.bg}`}>

      {/* soft light behind the product */}
      <div className={`pointer-events-none absolute right-[-5%] top-1/2 -translate-y-1/2 w-[55%] aspect-square rounded-full blur-3xl ${theme.glow}`} />

      {loading ? (
        <div className="relative flex items-center justify-center w-full h-full text-white/70 font-medium tracking-wide text-sm md:text-lg">
          Configuring latest catalog items...
        </div>
      ) : devices.length === 0 ? (
        <div className="relative flex items-center justify-center w-full h-full px-6 text-center text-white/80 font-medium text-sm md:text-lg">
          {category ? `No products in ${category} yet.` : 'No products available yet.'}
        </div>
      ) : (
        <>
          {/* SLIDING TRACK */}
          <div
            className="relative flex h-full w-full transition-transform duration-[800ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {devices.map((device, idx) => {
              const ram = getSpecValueByKey(device, 'ram');
              const storage = getSpecValueByKey(device, 'storage');
              const display = getSpecValueByKey(device, 'display');
              const isActive = idx === currentIndex;

              return (
                <div
                  key={device._id || device.id || idx}
                  className="w-full h-full shrink-0 grow-0 basis-full flex items-center justify-between gap-4 md:gap-8 px-5 md:px-14 lg:px-24"
                  aria-hidden={!isActive}
                >
                  {/* LEFT: text */}
                  <div
                    className={`flex flex-col justify-center items-start gap-2 md:gap-4 w-[52%] md:w-[46%] shrink-0 z-20 transition-all duration-700 delay-200 ease-out motion-reduce:transition-none ${
                      isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                    }`}
                  >
                    {device.brand && (
                      <span className={`text-[11px] md:text-sm font-semibold tracking-wide ${theme.accent}`}>
                        {device.brand}
                      </span>
                    )}

                    <h1 className="text-white font-semibold text-xl sm:text-3xl md:text-5xl lg:text-6xl leading-[1.08] tracking-tight line-clamp-3 break-words">
                      {device.name || 'Latest Tech'}
                    </h1>

                    {(ram || storage || display) ? (
                      <p className="text-white/75 text-[10px] sm:text-xs md:text-base lg:text-lg leading-snug">
                        {[
                          ram && `${ram} RAM`,
                          storage && `${storage} Storage`,
                          display && `${display} Display`,
                        ].filter(Boolean).join(', ')}
                      </p>
                    ) : (
                      device.description && (
                        <p className="text-white/75 text-[10px] sm:text-xs md:text-base lg:text-lg leading-snug line-clamp-2">
                          {device.description}
                        </p>
                      )
                    )}

                    <Button
                      onClick={() => navigateToProductDetails(device)}
                      className="mt-1 md:mt-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold px-4 py-1.5 md:px-7 md:py-3 rounded-md shadow-lg text-[11px] md:text-base transition-colors duration-200"
                    >
                      Shop Now
                    </Button>
                  </div>

                  {/* RIGHT: product image + price badge */}
                  <div
                    onClick={() => navigateToProductDetails(device)}
                    className={`relative flex-1 h-full min-w-0 flex items-center justify-center py-3 md:py-6 cursor-pointer z-10 transition-all duration-700 delay-100 ease-out motion-reduce:transition-none ${
                      isActive ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-16 scale-95'
                    }`}
                  >
                    <img
                      src={getSingleImageUrl(device.images?.[0])}
                      alt={device.name || "Product Banner Image"}
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl drop-shadow-[0_25px_35px_rgba(0,0,0,0.45)] transition-transform duration-700 hover:scale-105"
                    />

                    <div className="absolute top-1 right-0 md:top-4 md:right-2 bg-red-600 text-white rounded-full w-12 h-12 md:w-24 md:h-24 lg:w-28 lg:h-28 flex flex-col items-center justify-center shadow-xl border-2 md:border-4 border-white/90 select-none rotate-3">
                      <span className="text-[6px] md:text-xs uppercase font-bold opacity-90 tracking-wider">GHC</span>
                      <span className="text-[9px] md:text-lg lg:text-xl font-black tracking-tight leading-none mt-0.5">
                        {device.price ? device.price.toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* NAVIGATION DOTS */}
          {visibleDots.length > 1 && (
            <div className="absolute bottom-2 md:bottom-4 left-0 right-0 flex items-center justify-center gap-2 z-30">
              {visibleDots.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  onClick={() => setCurrentIndex(dotIdx)}
                  aria-label={`Go to slide ${dotIdx + 1}`}
                  className={`h-1.5 rounded-full cursor-pointer transition-all duration-500 ${
                    currentIndex === dotIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default PosterDisplay