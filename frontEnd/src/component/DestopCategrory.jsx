
import React, { useRef, useEffect, useCallback } from 'react'
import { DestopCategories } from './ProjectData'
import Title from './Title'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DestopCategory = () => {
  const scrollContainerRef = useRef(null);

  // Core navigation scroll calculation method wrapped in useCallback for stable interval tracking
  const handleScroll = useCallback((direction) => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth, scrollWidth } = scrollContainerRef.current;

      // Compute shift index distance dynamically matching active layout sizes
      const scrollAmount = clientWidth * 0.6;
      let targetDestination = direction === 'left'
        ? scrollLeft - scrollAmount
        : scrollLeft + scrollAmount;

      // Handle infinite loop boundaries for right arrow clicks or auto-scroll tracking
      if (direction === 'right' && scrollLeft + clientWidth >= scrollWidth - 10) {
        targetDestination = 0; // Wrap back to the beginning
      } else if (direction === 'left' && scrollLeft <= 5) {
        targetDestination = scrollWidth; // Wrap to the very end
      }

      scrollContainerRef.current.scrollTo({
        left: targetDestination,
        behavior: 'smooth'
      });
    }
  }, []);

  // Auto-scroll loop effect that shifts positions every 7 seconds
  useEffect(() => {
    const autoSlideTimer = setInterval(() => {
      handleScroll('right');
    }, 7000);

    return () => clearInterval(autoSlideTimer);
  }, [handleScroll]);

  return (
    <div className="space-y-8 relative max-w-7xl mx-auto  md:py-12 font-sans">

      {/* Premium Typography Heading Block */}
      <div className="flex flex-col items-center text-center justify-center w-full border-b border-slate-200 pb-4">
        <Title
          text1="SHOP BY "
          text2="CATEGORY"
          className="justify-center text-center gap-2 tracking-tight text-2xl md:text-3xl"
          text1className="text-slate-900 font-extrabold"
          text2className="font-light text-rose-600 uppercase tracking-widest"
        />
        <p className="text-xs text-slate-500 mt-1 font-medium tracking-wide max-w-md mx-auto">
          Find exactly what you’re looking for. Select a category below to browse our latest collection.
        </p>
      </div>

      {/* Main Carousel Presentation Layer */}
      <section className="relative flex justify-center items-center group/arrows">

        {/* LEFT NAVIGATIONAL DIRECTIONAL ARROW */}
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-0 z-30 flex items-center justify-center p-2 rounded-full border-red-200 bg-red-100 shadow-md text-red-700 hover:bg-red-200 hover:scale-110 active:scale-95 transition cursor-pointer -translate-x-2 md:-translate-x-4 duration-300 md:opacity-0 group-hover/arrows:opacity-100"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* HORIZONTAL ITEMS TRACK SCROLL CONTAINER */}
        <div
          ref={scrollContainerRef}
          className="flex gap-6 w-[95%] md:w-[90%] lg:w-[85%] overflow-x-auto scrollbar-none select-none items-center justify-start scroll-smooth py-4 px-2"
        >
          {DestopCategories.map((items) => {
            return (
              <div key={items.id} className="flex flex-col items-center gap-3 group min-w-28 sm:min-w-36 transition-transform duration-300">

                {/* Visual Circular Card Link */}
                <Link
                  to={items.to}
                  className="border border-slate-100 shadow-xs group-hover:border-rose-500 group-hover:bg-rose-50/30 group-hover:shadow-md transition duration-300 rounded-full flex items-center justify-center aspect-square w-24 sm:w-28 cursor-pointer bg-white"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-300">
                    <img
                      src={items.image}
                      className="max-w-full max-h-full object-contain mix-blend-multiply"
                      alt={items.name}
                    />
                  </div>
                </Link>

                {/* Text Title Component Layer */}
                <p className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-rose-600 transition-colors tracking-wide text-center truncate w-full pointer-events-none leading-tight">
                  {items.name}
                </p>
              </div>
            )
          })}
        </div>

        {/* RIGHT NAVIGATIONAL DIRECTIONAL ARROW */}
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-0 z-30 flex items-center justify-center p-2 rounded-full border-red-200 bg-red-100 shadow-md text-red-700 hover:bg-red-200 hover:scale-110 active:scale-95 transition cursor-pointer translate-x-2 md:translate-x-4 duration-300 md:opacity-0 group-hover/arrows:opacity-100"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

      </section>
    </div>
  )
}

export default DestopCategory;