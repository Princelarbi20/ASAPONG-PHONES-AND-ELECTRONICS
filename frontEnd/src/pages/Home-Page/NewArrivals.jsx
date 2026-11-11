import React, { useEffect, useState } from 'react'
import Title from '@/component/Title'
import axiosInstance, { resolveApiAssetUrl } from '@/lib/axios'
import { useNavigate } from 'react-router-dom'
import { formatPrice } from '@/lib/utils'

const SLIDE_INTERVAL_MS = 3000
const SLIDE_DURATION_MS = 700 // keep in sync with duration-700 below

const getSingleImageUrl = (imgStr) => {
  if (!imgStr) return 'https://placehold.co/600x400?text=No+Image';
  return resolveApiAssetUrl(imgStr.replace(/\\/g, '/'));
};

// Card image area. With more than one image it slides to the next one every few seconds.
// The first image is cloned at the end of the track, so after the last image it keeps
// sliding forward into the first one instead of rewinding across every slide.
const ProductCardImage = ({ images, name, isItemSoldOut, index }) => {
  const list = Array.isArray(images) && images.length > 0 ? images : [null]
  const count = list.length
  const hasMultiple = count > 1
  const slides = hasMultiple ? [...list, list[0]] : list

  const [position, setPosition] = useState(0)
  const [animate, setAnimate] = useState(true)

  // Auto-advance. Each card starts at a slightly different time so they don't all move together.
  useEffect(() => {
    if (!hasMultiple || isItemSoldOut) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let intervalId
    const startId = setTimeout(() => {
      setPosition((p) => (p >= count ? p : p + 1))
      intervalId = setInterval(() => {
        setPosition((p) => (p >= count ? p : p + 1))
      }, SLIDE_INTERVAL_MS)
    }, 1000 + (index % 4) * 450 + Math.random() * 200)

    return () => {
      clearTimeout(startId)
      clearInterval(intervalId)
    }
  }, [hasMultiple, isItemSoldOut, count, index])

  // When the clone of the first image is reached, jump back to the real first image without animation.
  useEffect(() => {
    if (position !== count || !hasMultiple) return
    const snapId = setTimeout(() => {
      setAnimate(false)
      setPosition(0)
    }, SLIDE_DURATION_MS)
    return () => clearTimeout(snapId)
  }, [position, count, hasMultiple])

  // Turn the animation back on after the jump has been painted.
  useEffect(() => {
    if (animate) return
    let inner
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setAnimate(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [animate])

  const activeDot = position % count

  return (
    <div className="w-full aspect-square bg-slate-50 rounded-xl relative overflow-hidden mb-4">
      <div
        className={`flex h-full w-full ${animate ? 'transition-transform duration-700 ease-in-out motion-reduce:transition-none' : ''}`}
        style={{ transform: `translateX(-${position * 100}%)` }}
      >
        {slides.map((img, i) => {
          const isClone = hasMultiple && i === count
          return (
            <div key={i} className="h-full w-full shrink-0 flex items-center justify-center p-3" aria-hidden={isClone}>
              <img
                src={getSingleImageUrl(img)}
                alt={isClone ? '' : hasMultiple ? `${name} view ${i + 1}` : name}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = 'https://placehold.co/600x400?text=No+Image'
                }}
                className={`max-w-full max-h-full object-contain pointer-events-none transform group-hover:scale-105 transition duration-500 ${isItemSoldOut ? 'opacity-60' : ''}`}
              />
            </div>
          )
        })}
      </div>

      {hasMultiple && !isItemSoldOut && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 bg-slate-900/10 backdrop-blur-sm px-1.5 py-1 rounded-full">
          {list.map((_, dotIdx) => (
            <span
              key={dotIdx}
              className={`h-1 rounded-full transition-all duration-300 ${dotIdx === activeDot ? 'w-3 bg-rose-600' : 'w-1 bg-slate-400/70'}`}
            />
          ))}
        </div>
      )}

      {isItemSoldOut && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-md tracking-wider uppercase">
            Sold Out
          </span>
        </div>
      )}
    </div>
  )
}

const NewArrivals = () => {
  const [newArrivals, setNewArrivals] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get('/get-All-product');

      let allProduct = [];
      if (response.data && Array.isArray(response.data.products)) {
        allProduct = response.data.products;
      } else if (Array.isArray(response.data)) {
        allProduct = response.data;
      }

      const filteredNewArrivals = allProduct.filter(product => product.newArrival === true)
      setNewArrivals(filteredNewArrivals)

    } catch (error) {
      console.error("Catalog API Fetch Failure:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProduct()
  }, [])

  return (
    <div className="w-full bg-slate-50  md:px-8  space-y-8 font-sans">

      {/* Premium Typography Heading Block with Infinite Smooth Scale Loop */}
      <div className="flex flex-col items-start justify-center w-full border-b border-slate-200 pb-4">
        <Title
          text1="NEW"
          text2="ARRIVALS"
          className="justify-start text-left gap-2 tracking-tight text-2xl md:text-3xl"
          text1className="text-slate-900 font-extrabold"
          text2className="font-light text-[#881337] uppercase tracking-widest"
        />
        <p className="text-xs text-slate-900 mt-1 font-medium tracking-wide">
          Explore our latest curated additions
        </p>
      </div>

      {/* Product Display Layout Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-slate-100/80 border border-slate-200 rounded-2xl h-72 animate-pulse w-full" />
          ))}
        </div>
      ) : newArrivals.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {newArrivals.map((item, index) => {
            const itemId = item._id || item.id;
            const isItemSoldOut = item.stock <= 0;
            return (
              <div
                key={itemId}
                onClick={() => {
                  navigate(`/product-details/${itemId}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white border border-slate-100 rounded-2xl p-3 md:p-4 flex flex-col justify-between shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden"
              >
                {/* Image Showcase Box (slides when the product has several images) */}
                <ProductCardImage
                  images={item.images}
                  name={item.name}
                  isItemSoldOut={isItemSoldOut}
                  index={index}
                />

                {/* Info & Text Parameters */}
                <div className="space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block mb-0.5">
                      {item.brand || "Brand"}
                    </span>
                    <h3 className="text-xs md:text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-rose-600 transition-colors duration-200 leading-snug">
                      {item.name}
                    </h3>
                  </div>

                  {/* Pricing Details Line */}
                  <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between">
                    <span className="text-sm md:text-base font-bold text-slate-900">
                      {formatPrice(item.price)}
                    </span>
                    <span className="text-[9px] text-rose-600 bg-rose-50 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border border-rose-100">
                      New
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-sm text-slate-600 font-medium italic">
          No items are currently tagged as new arrivals.
        </div>
      )}
    </div>
  )
}

export default NewArrivals;
