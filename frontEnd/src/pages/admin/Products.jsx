import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance, { API_ORIGIN } from '../../lib/axios';
import { Plus, Edit3, Trash2, Loader2, AlertCircle, X, Info, Calendar, ChevronLeft, ChevronRight, Star, Settings, Filter, ArrowUpDown, ChevronDown, Search } from 'lucide-react';
import AddProduct from './AddProduct';
import UpdateProduct from './UpdateProduct';
import { formatPrice } from '@/lib/utils';
import PaginationControls from '@/component/PaginationControls';

const PAGE_SIZE = 12;

// Hardcoded comprehensive category options matrix as requested
const FILTER_CATEGORIES = [
  "All",
  "Television",
  "Phones",
  "Laptops",
  "Fridge",
  "Speakers",
  "Appliances",
  "Air Conditions",
  "Washing Machines",
  "Accessories"
];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Filter, Search, and Sorting States
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [brandSortOrder, setBrandSortOrder] = useState('none'); // 'none' | 'asc' | 'desc'
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

  // Custom Staged UI Toast Notification Center States
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToastNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // GET ALL PRODUCTS
  const fetchProducts = useCallback(async (signal) => {
    try {
      setLoading(true);
      setErrorMsg('');

      const response = await axiosInstance.get('/get-All-product', {
        params: {
          page,
          limit: PAGE_SIZE,
          category: selectedCategory,
          search: searchQuery.trim(),
          brandSort: brandSortOrder,
        },
        signal,
      });

      if (response.data && Array.isArray(response.data.products)) {
        setProducts(response.data.products);
        setPagination(response.data.pagination || { total: response.data.products.length, totalPages: 1 });
      } else if (Array.isArray(response.data)) {
        setProducts(response.data);
        setPagination({ total: response.data.length, totalPages: 1 });
      } else {
        setProducts([]);
        setPagination({ total: 0, totalPages: 0 });
      }
    } catch (err) {
      if (signal?.aborted || err.code === 'ERR_CANCELED') return;
      console.error('Error fetching products:', err);
      setErrorMsg(err.response?.data?.message || 'Access Denied: Unable to fetch inventory data.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page, selectedCategory, searchQuery, brandSortOrder]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  useEffect(() => {
    const lastPage = Math.max(1, pagination.totalPages);
    if (page > lastPage) setPage(lastPage);
  }, [page, pagination.totalPages]);

  // CLOSE DROPDOWN WHEN CLICKING EXTERNAL NODES
  useEffect(() => {
    const handleOutsideClick = () => setIsFilterDropdownOpen(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // DELETE PRODUCT 
  const handleDeleteProduct = async (id, e) => {
    if (e) e.stopPropagation();

    if (confirm('Permanently delete this item from inventory?')) {
      try {
        await axiosInstance.delete(`/products-delete/${id}`);

        setSelectedProduct(null);
        showToastNotification('Product successfully deleted from inventory database.', 'success');
        await fetchProducts();
      } catch (err) {
        console.error(err);
        showToastNotification(err.response?.data?.message || 'Could not delete the product.', 'error');
      }
    }
  };

  const getSingleImageUrl = (imgStr) => {
    if (!imgStr) return 'https://placehold.co/600x400?text=No+Image';
    if (typeof imgStr !== 'string') return 'https://placehold.co/600x400?text=No+Image';
    if (imgStr.startsWith('http')) return imgStr;
    const normalizedPath = imgStr.replace(/\\/g, '/');
    if (normalizedPath.startsWith('/uploads/')) {
      return `${API_ORIGIN}${normalizedPath}`;
    }
    return `${API_ORIGIN}/${normalizedPath.replace(/^\//, '')}`;
  };

  const handleNextImage = (e, totalImages) => {
    e.stopPropagation();
    setActiveImageIndex((prevIndex) => (prevIndex + 1) % totalImages);
  };

  const handlePrevImage = (e, totalImages) => {
    e.stopPropagation();
    setActiveImageIndex((prevIndex) => (prevIndex - 1 + totalImages) % totalImages);
  };

  const renderStars = (ratingValue) => {
    const totalStars = parseInt(ratingValue, 10) || 0;
    const clampedStars = Math.min(Math.max(totalStars, 0), 5);

    if (clampedStars === 0) return <span className="text-[11px] text-gray-400 italic">Unrated</span>;

    return (
      <div className="flex gap-0.5 items-center">
        {Array.from({ length: clampedStars }).map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
    );
  };

  // Pipeline Filter, Search, and Sorting Execution Matrices
  const processedProducts = products;

  return (
    <div className="space-y-6 p-6 relative">
      <style dangerouslySetInnerHTML={{
        __html: `
        /* Remove native layout scrollbars entirely from UI side modal and side draw workflows */
        .scrollbar-none::-webkit-scrollbar { display: none !important; width: 0px !important; }
        .scrollbar-none { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      `}} />

      {/* Dynamic Render Custom UI Toast Floating Nodes Stack */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-100 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all duration-300 backdrop-blur-md translate-y-0 ${toast.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <p className="text-xs font-semibold tracking-wide">{toast.message}</p>
          <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="ml-2 hover:opacity-70 cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Inventory Management</h2>
          <p className="text-xs text-gray-400 mt-0.5">Control pipeline distribution indexes, dynamic category metrics spreadsheets, and product tags</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Control Panel: Fully Responsive Dropdown Filters, Real-Time Search Input & Sorting Matrix Layout Toolbelt */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-gray-50/50 p-4 border border-gray-100 rounded-xl">

        {/* CONTAINER LEFT: CATEGORY DROPDOWN SELECTOR */}
        <div className="relative flex items-center gap-2 w-full lg:w-auto" onClick={(e) => e.stopPropagation()}>
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1 shrink-0">Category:</span>

          <button
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-55 shadow-xs transition cursor-pointer w-full lg:w-44"
          >
            <span>{selectedCategory}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFilterDropdownOpen && (
            <div className="absolute top-full left-0 lg:left-23.75 mt-1.5 w-full lg:w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1 max-h-60 overflow-y-auto scrollbar-none animate-in fade-in slide-in-from-top-2 duration-150">
              {FILTER_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setPage(1);
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors cursor-pointer block ${selectedCategory === cat
                    ? 'bg-indigo-50 text-indigo-600 font-bold'
                    : 'text-gray-600 hover:bg-gray-55'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CONTAINER CENTER: FULLY RESPONSIVE DYNAMIC INPUT SEARCH BAR */}
        <div className="relative w-full lg:max-w-md flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search products by title or brand identity..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:outline-none focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs bg-white text-gray-800 placeholder:text-gray-400 font-medium shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setPage(1); }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* CONTAINER RIGHT: ALPHABETICAL BRAND SORT SELECTOR */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-xs w-full lg:w-auto shrink-0 justify-between lg:justify-start">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Sort Brand:</span>
          </div>
          <select
            value={brandSortOrder}
            onChange={(e) => { setBrandSortOrder(e.target.value); setPage(1); }}
            className="text-xs font-semibold text-gray-700 focus:outline-none bg-transparent cursor-pointer pl-1 text-right lg:text-left"
          >
            <option value="none">Default Listing</option>
            <option value="asc">Alphabetical (A-Z)</option>
            <option value="desc">Reverse Order (Z-A)</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 border border-red-200 text-sm font-medium text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : processedProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-400">
          No inventory stock items matching current catalog filtering query parameters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {processedProducts.map((product, index) => {
            const id = product._id || product.id;
            return (
              <div
                key={`${id ?? 'product'}-${index}`}
                onClick={() => {
                  setSelectedProduct(product);
                  setActiveImageIndex(0);
                }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition flex flex-col group"
              >
                {/* FIXED: Swapped object-cover to object-contain, added flex center styles, and a solid bg-white padding shell to perfectly reveal the absolute full image scope */}
                <div className="relative aspect-video w-full bg-white flex items-center justify-center border-b border-gray-100 overflow-hidden p-2">
                  <img
                    src={getSingleImageUrl(product.images?.[0])}
                    alt={product.name}
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-200"
                  />
                  <span className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-xs tracking-wider uppercase">
                    {product.category || 'General'}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-0.5">
                      <p className="text-xs font-semibold text-indigo-600 tracking-wider uppercase">
                        {product.brand || 'Generic'}
                      </p>
                      {renderStars(product.rating)}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">
                      {product.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                    <div>
                      <p className="text-xs text-gray-400">Price</p>
                      <p className="font-bold text-gray-900 text-sm">{formatPrice(product.price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Stock</p>
                      <p className={`text-xs font-semibold ${product.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {product.stock > 0 ? `${product.stock} units` : 'Out of Stock'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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

      {/* DETAILED VIEW MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-[90vh]">

            {/* Gallery Viewport */}
            <div className="w-full h-64 bg-slate-950 relative group/carousel flex items-center justify-center shrink-0">
              <img
                src={getSingleImageUrl(selectedProduct.images?.[activeImageIndex])}
                alt={`${selectedProduct.name} View ${activeImageIndex + 1}`}
                className="w-full h-full object-contain"
              />

              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 bg-slate-900/60 hover:bg-slate-900/80 text-white p-1.5 rounded-full backdrop-blur-xs transition z-10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {selectedProduct.images && selectedProduct.images.length > 1 && (
                <>
                  <button
                    onClick={(e) => handlePrevImage(e, selectedProduct.images.length)}
                    className="absolute left-3 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md transition transform opacity-100 md:opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => handleNextImage(e, selectedProduct.images.length)}
                    className="absolute right-3 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md transition transform opacity-100 md:opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    {selectedProduct.images.map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 rounded-full transition-all duration-150 ${idx === activeImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails Row */}
            {selectedProduct.images && selectedProduct.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3 bg-slate-50 border-b border-gray-100 scrollbar-thin shrink-0">
                {selectedProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-14 h-14 rounded-md overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${idx === activeImageIndex ? 'border-indigo-600 ring-2 ring-indigo-100 scale-95' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={getSingleImageUrl(img)} alt="Thumbnail reference" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Modal Body Info */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-modal-scrollbar">
              <style dangerouslySetInnerHTML={{
                __html: `
                .custom-modal-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-modal-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
                .custom-modal-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
              `}} />

              <div>
                <div className="flex justify-between items-center">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[10px] uppercase tracking-wider">{selectedProduct.category}</span>
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-100 px-2 py-1 rounded-md">
                    <span className="text-[11px] font-medium text-gray-500">Rating:</span>
                    {renderStars(selectedProduct.rating)}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mt-2">{selectedProduct.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Brand Identity: <span className="font-semibold text-gray-600">{selectedProduct.brand || 'N/A'}</span></p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-medium">MSRP Price</p>
                  <p className="text-base font-bold text-gray-900">{formatPrice(selectedProduct.price)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Available Inventory</p>
                  <p className="text-base font-bold text-gray-900">{selectedProduct.stock} Units</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Info className="w-3.5 h-3.5" /> General Description</p>
                <p className="text-sm text-gray-600 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-gray-100">{selectedProduct.description || 'No descriptive breakdown provided.'}</p>
              </div>

              {/* DYNAMIC TECHNICAL DATA GRID SHEET */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Settings className="w-3.5 h-3.5" /> Technical Specifications ({selectedProduct.category || 'General'})
                </p>
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs divide-y divide-gray-100">
                  {selectedProduct.specifications && selectedProduct.specifications.length > 0 ? (
                    selectedProduct.specifications.map((spec, i) => (
                      <div key={i} className="grid grid-cols-3 p-2.5 text-xs hover:bg-slate-50/80 transition-colors gap-4">
                        <span className="font-bold text-gray-400 capitalize">{spec.key}</span>
                        <span className="col-span-2 font-semibold text-gray-700 whitespace-pre-line">{spec.value || 'N/A'}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs italic text-gray-400">
                      No advanced technical attributes mapped to this item profile.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-500 text-xs border-t pt-4">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="font-medium text-gray-400 uppercase tracking-tight text-[10px]">Publish Log Timestamp</p>
                  <p className="font-medium text-gray-700">
                    {selectedProduct.createdAt ? new Date(selectedProduct.createdAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Initial System Creation Log'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between gap-3 shrink-0">
              <button
                onClick={(e) => handleDeleteProduct(selectedProduct._id || selectedProduct.id, e)}
                className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold rounded-lg text-sm transition flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete Stock
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const targetProduct = { ...selectedProduct };
                  setEditingProduct(targetProduct);
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition flex items-center gap-2 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" /> Edit Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Modals */}
      {showAddModal && <AddProduct onClose={() => setShowAddModal(false)} onRefresh={fetchProducts} />}

      {editingProduct && (
        <UpdateProduct
          productToEdit={editingProduct}
          onClose={(updatedMsg) => {
            setEditingProduct(null);
            if (updatedMsg && typeof updatedMsg === 'string') {
              showToastNotification(updatedMsg, 'success');
            }
          }}
          onRefresh={fetchProducts}
        />
      )}
    </div>
  );
}
