import React, { useState, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from 'axios';
import { authAction } from "../redux/store";
import Logo from "./Logo";
import { Button } from "./Button";
import { categories, profileDetails } from "./ProjectData";
import {
  ShoppingCart, LogOut, User, Menu, X, ChevronRight, Layers,
  Smartphone, Laptop, Tv, Speaker, Cable, Snowflake, Disc,
  Package, LayoutDashboard, Settings, UserCheck, Heart, HelpCircle
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Navbar = ({ globalSearchQuery, setGlobalSearchQuery }) => {
  const [isVisible, setIsvisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [allProducts, setAllProducts] = useState([]);
  const [matchedSuggestions, setMatchedSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isAuthenticated = useSelector((state) => state.auth.isLogin);
  const user = useSelector((state) => state.auth.user);

  const cartItemCount = user?.cart?.reduce((total, item) => total + (item.quantity || 1), 0) || 0;

  // Freeze background body scroll track when either drawer interface is opened
  useEffect(() => {
    if (isMenuOpen || isVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen, isVisible]);

  const handleLogout = () => {
    dispatch(authAction.logout());
    setIsMenuOpen(false);
    setIsvisible(false);
    navigate("/auth/login");
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (matchedSuggestions.length > 0) {
        navigate(`/product-details/${matchedSuggestions[0]._id || matchedSuggestions[0].id}`);
        updateSearchValue('');
        setShowSearchSuggestions(false);
      }
    }
  };

  const updateSearchValue = (value) => {
    setSearchTerm(value);
    if (typeof setGlobalSearchQuery === 'function') {
      setGlobalSearchQuery(value);
    }
  };

  const handleSearchInput = (value) => {
    updateSearchValue(value);
    const query = value?.trim().toLowerCase() || "";

    if (!query) {
      setMatchedSuggestions([]);
      setShowSearchSuggestions(false);
      return;
    }

    const matches = allProducts
      .filter((product) => {
        const name = product?.name || "";
        const brand = product?.brand || "";
        return (
          name.toLowerCase().includes(query) ||
          brand.toLowerCase().includes(query)
        );
      })
      .slice(0, 8);

    setMatchedSuggestions(matches);
    setShowSearchSuggestions(true);
  };

  const openCategoryDrawer = () => {
    setActiveTab("category");
    setIsvisible(true);
  };

  const openProfileDrawer = () => {
    setActiveTab("profile");
    setIsvisible(true);
  };

  const toggleMobileMenu = () => {
    if (!isMenuOpen) setActiveTab("profile");
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/v1/get-All-product`);
        const products = response.data?.products || response.data || [];
        setAllProducts(Array.isArray(products) ? products : []);
      } catch (err) {
        console.error('Could not load product suggestions:', err);
      }
    };

    fetchAllProducts();
  }, []);

  const getDynamicLinkIcon = (name, customColorClass = "text-slate-400") => {
    const cleanName = name?.toLowerCase() || "";
    const iconProps = `w-4 h-4 transition-colors shrink-0 ${customColorClass}`;

    if (cleanName.includes("phone")) return <Smartphone className={iconProps} />;
    if (cleanName.includes("laptop")) return <Laptop className={iconProps} />;
    if (cleanName.includes("television") || cleanName.includes("tv")) return <Tv className={iconProps} />;
    if (cleanName.includes("speaker") || cleanName.includes("audio")) return <Speaker className={iconProps} />;
    if (cleanName.includes("fridge") || cleanName.includes("refrigerator")) return <Snowflake className={iconProps} />;
    if (cleanName.includes("washing")) return <Disc className={iconProps} />;
    if (cleanName.includes("accessory") || cleanName.includes("accessories")) return <Cable className={iconProps} />;

    if (cleanName.includes("dashboard") || cleanName.includes("overview")) return <LayoutDashboard className={iconProps} />;
    if (cleanName.includes("order") || cleanName.includes("purchase")) return <Package className={iconProps} />;
    if (cleanName.includes("cart") || cleanName.includes("basket")) return <ShoppingCart className={iconProps} />;
    if (cleanName.includes("profile") || cleanName.includes("account")) return <UserCheck className={iconProps} />;
    if (cleanName.includes("wishlist") || cleanName.includes("favorite")) return <Heart className={iconProps} />;
    if (cleanName.includes("setting")) return <Settings className={iconProps} />;

    return <HelpCircle className={iconProps} />;
  };

  const targetMenuLinks = activeTab === "profile" ? profileDetails : categories;

  return (
    <nav className="w-full border-b border-gray-200 bg-red-50 px-1 md:px-8 py-1 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-2 md:gap-4">

        {/* LOGO */}
        <div className="shrink-0">
          <Logo />
        </div>

        {/* SEARCH BAR CENTERED */}
        <div className="relative flex-1 max-w-xs sm:max-w-md md:max-w-lg mx-2 transition-all duration-200">
          <input
            type="text"
            placeholder="Search products..."
            value={typeof globalSearchQuery === 'string' ? globalSearchQuery : searchTerm}
            onChange={(e) => handleSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => {
              const currentVal = typeof globalSearchQuery === 'string' ? globalSearchQuery : searchTerm;
              if (currentVal.trim()) setShowSearchSuggestions(true);
            }}
            className="w-full pl-4 pr-4 py-2 text-xs sm:text-sm rounded-full border border-gray-300 focus:ring-2 focus:outline-none focus:ring-red-400 bg-white text-gray-800"
          />

          {showSearchSuggestions && (
            <div className="absolute left-0 right-0 mt-2 z-[60] max-h-72 overflow-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
              {matchedSuggestions.length > 0 ? (
                matchedSuggestions.map((product, index) => {
                  const id = product._id || product.id;
                  return (
                    <button
                      key={`${id ?? 'product'}-${index}`}
                      type="button"
                      onClick={() => {
                        updateSearchValue('');
                        setShowSearchSuggestions(false);
                        navigate(`/product-details/${id}`);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-red-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm font-semibold text-gray-900 truncate">{product.name}</div>
                      <div className="text-xs text-gray-500 truncate">{product.brand || 'Unknown brand'}</div>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-4 text-center text-sm font-semibold text-red-500 bg-red-50/30">
                  Product Not Available
                </div>
              )}
            </div>
          )}
        </div>

        {/* DESKTOP NAVIGATION LINKS */}
        <ul className="hidden xl:flex gap-6 font-semibold text-sm text-gray-700">
          <li><NavLink to="/" className={({ isActive }) => isActive ? "text-red-600" : "hover:text-red-400 transition"}>Home</NavLink></li>
          <li><NavLink to="/about" className={({ isActive }) => isActive ? "text-red-600" : "hover:text-red-400 transition"}>About</NavLink></li>
          <li><NavLink to="/shops" className={({ isActive }) => isActive ? "text-red-600" : "hover:text-red-400 transition"}>Shops</NavLink></li>
        </ul>

        {/* ACTIONS LAYER CONTAINER */}
        <div className="flex items-center gap-1 sm:gap-3 md:gap-4 shrink-0">
          <Button
            onClick={openCategoryDrawer}
            className="hidden md:block bg-white border-gray-300 rounded-lg text-sm px-4 py-2 hover:bg-red-100 hover:text-red-600 transition-colors font-medium cursor-pointer"
          >
            Categories
          </Button>

          <Link to="/cart" className="relative p-2.5 text-gray-600 hover:text-red-600 hover:bg-red-100 rounded-full transition-all group">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 md:w-5 md:h-5" />
            {cartItemCount > 0 && (
              <span className="absolute top-0 right-0 md:-top-1 md:-right-1 bg-white text-red-600 font-extrabold text-[9px] md:text-[10px] w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {cartItemCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={openProfileDrawer}
              className="hidden md:flex items-center gap-1.5 pl-2 border-l border-gray-200 text-sm text-gray-700 font-medium bg-white px-2.5 py-1.5 rounded-lg border border-gray-100 shadow-3xs hover:bg-red-50 hover:text-red-600 transition"
            >
              <User className="w-4 h-4 text-gray-400" />
              <span className="max-w-20 lg:max-w-25 truncate">{user?.userName || 'Account'}</span>
            </button>
          ) : (
            <Link
              to="/auth/login"
              className="hidden md:block bg-red-400 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-500 transition shadow-sm"
            >
              Sign In
            </Link>
          )}

          <button
            onClick={toggleMobileMenu}
            className={`p-2 text-gray-600 hover:text-gray-900 focus:outline-none z-50 md:hidden relative ${isMenuOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            aria-label="Toggle Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* MOBILE NAV SIDEBAR DRAWER PANEL LAYOUTS */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] transition-opacity md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div
        className={`
          fixed right-0 top-0 h-screen w-[53vw] bg-white p-4 z-[70] md:hidden
          flex flex-col shadow-2xl transition-transform duration-300 ease-in-out pt-6
          ${isMenuOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between w-full mb-6 border-b border-gray-100 pb-3">
          <div className="pl-1">
            <Logo />
          </div>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="p-1.5 rounded-full hover:bg-red-100 text-gray-500 hover:text-red-600 cursor-pointer"
            aria-label="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4 text-xs font-bold uppercase tracking-wider select-none">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-1.5 pb-2 transition-all cursor-pointer border-b-2 px-1 ${activeTab === "profile" ? "border-red-400 text-red-500 font-extrabold" : "border-transparent text-gray-400 hover:text-red-400"}`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => setActiveTab("category")}
            className={`flex items-center gap-1.5 pb-2 transition-all cursor-pointer border-b-2 px-1 ${activeTab === "category" ? "border-red-400 text-red-500 font-extrabold" : "border-transparent text-gray-400 hover:text-red-400"}`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Category</span>
          </button>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[60vh] pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {targetMenuLinks.map((items) => (
            <NavLink
              key={items.id}
              to={items.to}
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) => `
                w-full text-left px-3.5 py-2.5 rounded-xl transition-all duration-200 
                flex items-center justify-between font-bold text-xs group select-none
                ${isActive ? "bg-red-400 text-white shadow-sm" : "text-gray-600 hover:bg-red-100 hover:text-red-500"}
              `}
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5 truncate">
                    {getDynamicLinkIcon(items.name, isActive ? "text-white" : "text-slate-400 group-hover:text-red-400")}
                    <span className="truncate">{items.name}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100">
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5 w-full">
              <div className="flex items-center gap-1 flex-1 bg-gray-50 border border-gray-100 px-2 py-2 rounded-xl text-[11px] font-bold text-gray-600 min-w-0">
                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{user?.userName || 'User'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-50 text-red-600 p-2 rounded-xl flex items-center justify-center border border-red-200 hover:bg-red-100 shadow-2xs cursor-pointer shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth/login"
              onClick={() => setIsMenuOpen(false)}
              className="block w-full bg-red-400 text-white text-center text-xs font-bold py-2 rounded-xl hover:bg-red-500 shadow-xs transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* DESKTOP SIDEBAR DRAWER LAYER SYSTEM */}
      {isVisible && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] transition-opacity hidden md:block"
          onClick={() => setIsvisible(false)}
        />
      )}

      <div
        className={`
          fixed right-0 top-0 h-screen w-[30vw] bg-white p-4 z-[70] hidden md:flex
          flex-col shadow-2xl transition-transform duration-300 ease-in-out pt-6
          ${isVisible ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between w-full mb-6 border-b border-gray-100 pb-3">
          <div className="pl-1">
            <Logo />
          </div>
          <button
            onClick={() => setIsvisible(false)}
            className="p-1.5 rounded-full hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
            aria-label="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4 text-xs font-bold uppercase tracking-wider select-none">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-1.5 pb-2 transition-all cursor-pointer border-b-2 px-1 ${activeTab === "profile" ? "border-red-400 text-red-500 font-extrabold" : "border-transparent text-gray-400 hover:text-red-400"}`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => setActiveTab("category")}
            className={`flex items-center gap-1.5 pb-2 transition-all cursor-pointer border-b-2 px-1 ${activeTab === "category" ? "border-red-400 text-red-500 font-extrabold" : "border-transparent text-gray-400 hover:text-red-400"}`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Category</span>
          </button>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[60vh] pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {targetMenuLinks.map((items) => (
            <NavLink
              key={items.id}
              to={items.to}
              onClick={() => setIsvisible(false)}
              className={({ isActive }) => `
                w-full text-left px-3.5 py-2.5 rounded-xl transition-all duration-200 
                flex items-center justify-between font-bold text-xs group select-none
                ${isActive ? "bg-red-400 text-white shadow-sm" : "text-gray-600 hover:bg-red-100 hover:text-red-500"}
              `}
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5 truncate">
                    {getDynamicLinkIcon(items.name, isActive ? "text-white" : "text-slate-400 group-hover:text-red-400")}
                    <span className="truncate">{items.name}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100">
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5 w-full">
              <div className="flex items-center gap-1 flex-1 bg-gray-50 border border-gray-100 px-2 py-2 rounded-xl text-[11px] font-bold text-gray-600 min-w-0">
                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{user?.userName || 'User'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-50 text-red-600 p-2 rounded-xl flex items-center justify-center border border-red-200 hover:bg-red-100 shadow-2xs cursor-pointer shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth/login"
              onClick={() => setIsvisible(false)}
              className="block w-full bg-red-400 text-white text-center text-xs font-bold py-2 rounded-xl hover:bg-red-500 shadow-xs transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
