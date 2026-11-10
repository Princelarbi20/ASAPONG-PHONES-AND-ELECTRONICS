import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/component/Button'
import { FaAngleRight, FaAngleLeft } from "react-icons/fa"
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

// Get backend base URL from Vite environment variables with a fallback to http://localhost:5000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const Hero = () => {
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

        const response = await axios.get(`${API_BASE_URL}/api/v1/get-All-product`);

        let rawProductsList = [];
        if (response.data && Array.isArray(response.data.products)) {
          rawProductsList = response.data.products;
        } else if (Array.isArray(response.data)) {
          rawProductsList = response.data;
        }

        if (rawProductsList.length > 0) {
          setDevices(rawProductsList);
        } else {
          setDevices(fallbackMockData);
        }
      } catch (error) {
        console.error("Local catalog endpoint fetch failed, loading custom slide rollbacks:", error);
        setDevices(fallbackMockData);
      } finally {
        setLoading(false);
      }
    };
    fetchDeviceData();
  }, [fallbackMockData]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === devices.length - 1 ? 0 : prev + 1));
  }, [devices.length]);

  useEffect(() => {
    if (devices.length === 0) return;
    const sliderTimer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(sliderTimer);
  }, [devices.length, nextSlide]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? devices.length - 1 : prev - 1));
  };

  const getSingleImageUrl = (imgStr) => {
    if (!imgStr) return 'https://placehold.co/600x400?text=No+Image';
    if (imgStr.startsWith('http')) return imgStr;
    const normalizedPath = imgStr.replace(/\\/g, '/');
    if (normalizedPath.startsWith('/uploads/')) {
      return `${API_BASE_URL}${normalizedPath}`;
    }
    return `${API_BASE_URL}/${normalizedPath.replace(/^\//, '')}`;
  };

  const activeDevice = devices[currentIndex];

  const navigateToProductDetails = () => {
    if (!activeDevice) return;
    const targetId = activeDevice._id || activeDevice.id;
    navigate(`/product-details/${targetId}`);
  };

  // Upgraded specification key parser designed to map exact variations inside your database structure
  const getSpecValueByKey = (keyName) => {
    if (!activeDevice || !activeDevice.specifications) return '';

    const searchKey = keyName.toLowerCase();

    // Find specifications that match or include your structural naming keys
    const match = activeDevice.specifications.find(s => {
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

  return (
    // MAIN WRAPPER
    <div className="bg-slate-50 relative w-full max-w-full h-[30vh] md:h-[45vh] lg:h-[60vh] flex flex-col justify-between p-0 group overflow-hidden">

      {/* 1. TOP CONTENT SPLIT CONTAINER */}
      <div className="w-full flex-1 flex flex-row items-center justify-between gap-4 md:gap-8 bg-white px-6 md:px-16 lg:px-24 pt-2 pb-4 sm:py-4 rounded-none relative overflow-hidden">

        {loading ? (
          <div className="flex items-center justify-center w-full h-full text-slate-400 font-medium tracking-wide text-sm md:text-lg">
            Configuring latest catalog items...
          </div>
        ) : (
          <>
            {/* [LEFT PART] */}
            <div className="flex flex-col justify-center items-start gap-2 md:gap-4 w-full max-w-[35%] shrink-0 z-20">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-red-600 bg-red-50 px-2.5 py-1 rounded-md">
                {activeDevice?.brand || "Premium"}
              </span>

              <h1 className="text-slate-900 font-black text-sm md:text-2xl lg:text-4xl tracking-tight leading-tight uppercase break-words w-full flex flex-col gap-1 md:gap-2">
                {/* Product Title Label */}
                <span className="text-indigo-600 font-black block lowercase text-xs md:text-lg lg:text-xl truncate uppercase font-sans tracking-wide">
                  {activeDevice?.name || 'Showcase'}
                </span>

                {/* Vertical Stack Layout Parameter Fields */}
                <span className="text-slate-500 font-medium normal-case text-[11px] md:text-sm lg:text-base flex flex-col gap-0.5 md:gap-1">
                  {getSpecValueByKey('ram') && (
                    <span>
                      RAM: <span className="text-red-600 font-bold">{getSpecValueByKey('ram')}</span>
                    </span>
                  )}
                  {getSpecValueByKey('storage') && (
                    <span>
                      Storage: <span className="text-slate-800 font-semibold">{getSpecValueByKey('storage')}</span>
                    </span>
                  )}
                  {getSpecValueByKey('display') && (
                    <span>
                      Display: <span className="text-slate-800 font-semibold">{getSpecValueByKey('display')}</span>
                    </span>
                  )}
                </span>
              </h1>

              <Button
                onClick={navigateToProductDetails}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2 md:px-6 md:py-3 rounded-md shadow-md text-[10px] md:text-sm tracking-wide uppercase transition-all duration-200 mt-1"
              >
                Shop Now
              </Button>
            </div>

            {/* [CENTER PART] */}
            <div
              onClick={navigateToProductDetails}
              className="flex-1 h-full w-full min-w-0 flex items-center justify-center z-10 p-2 md:p-4 relative mix-blend-multiply cursor-pointer"
            >
              <img
                key={currentIndex}
                src={getSingleImageUrl(activeDevice?.images?.[0])}
                alt={activeDevice?.name || "Product Banner Image"}
                className="max-w-full max-h-full w-auto h-auto object-contain transform transition-transform duration-700 hover:scale-105 drop-shadow-2xl mx-auto"
              />
            </div>

            {/* [RIGHT PART] */}
            <div className="flex flex-col items-end justify-center gap-3 md:gap-3 w-full max-w-[30%] shrink-0 z-20">
              <div className="hidden lg:flex flex-col items-center bg-slate-50 border border-dashed border-slate-300 p-3 text-center select-none rounded-md w-44">
                <span className="text-xs font-bold text-slate-500 tracking-wide uppercase">{activeDevice?.brand || "EXCLUSIVE"}</span>
                <span className="text-sm font-black text-slate-800 leading-none mt-1">EXCLUSIVE STOCK</span>
                <div className="bg-emerald-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-sm mt-1.5">BEST PRICE</div>
              </div>

              <div className="bg-red-600 text-white rounded-full w-12 h-12 md:w-24 md:h-24 lg:w-28 lg:h-28 flex flex-col items-center justify-center shadow-xl border-2 md:border-4 border-white select-none shrink-0 transform rotate-3">
                <span className="text-[6px] md:text-xs uppercase font-bold opacity-90 tracking-wider">GHC</span>
                <span className="text-[9px] md:text-lg lg:text-xl font-black tracking-tight leading-none mt-0.5">
                  {activeDevice?.price ? activeDevice.price.toLocaleString() : '0'}
                </span>
              </div>
            </div>

            {/* Navigation Handles */}
            <button
              onClick={prevSlide}
              className="hidden md:block absolute left-4 md:left-8 top-1/2 -translate-y-1/2 bg-red-100 hover:bg-red-200 shadow-md p-2 rounded-full text-red-700 opacity-0 group-hover:opacity-100 transition-all duration-300 border border-red-200 z-30 cursor-pointer hover:scale-110 active:scale-95"
            >
              <FaAngleLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="hidden md:block absolute right-4 md:right-8 top-1/2 -translate-y-1/2 bg-red-100 hover:bg-red-200 shadow-md p-2 rounded-full text-red-700 opacity-0 group-hover:opacity-100 transition-all duration-300 border border-red-200 z-30 cursor-pointer hover:scale-110 active:scale-95"
            >
              <FaAngleRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* 2. BOTTOM CARD LAYER - Navigation Dots Panel */}
      {!loading && devices.length > 0 && (
        <div className="w-full flex items-center justify-center gap-2 py-2 bg-white border-t border-slate-100 rounded-none shrink-0">
          {devices.slice(0, 8).map((_, dotIdx) => (
            <button
              key={dotIdx}
              onClick={() => setCurrentIndex(dotIdx)}
              className={`h-1.5 transition-all duration-300 rounded-full cursor-pointer ${currentIndex === dotIdx ? 'w-6 bg-red-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Hero