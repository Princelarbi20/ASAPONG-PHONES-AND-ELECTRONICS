import React, { useState, useEffect } from 'react';
import axiosInstance, { resolveApiAssetUrl } from '../../lib/axios';
import { X, Loader2, Upload, Star, Trash2 } from 'lucide-react';

// Dynamic Category Configuration Matrix for All Specification Sheets
const CATEGORY_CONFIG = {
  Television: {
    brands: ["Samsung", "LG", "Hisense", "TCL", "Nasco", "Bruhm", "Skyworth", "Sony", "Syinix", "Nexus", "Sharp", "Panasonic", "Toshiba", "Philips", "Changhong", "Haier", "Midea", "Royal", "Ailyons", "Vision"],
    fields: ["Name", "Frame TV", "TV Type", "Design", "Screen Type", "Art Mode", "Power Modes", "Google Assistant", "Netflix", "Prime Video", "OYO Care", "Display Technology"]
  },
  Phones: {
    brands: ["Samsung", "Apple", "Tecno", "Infinix", "itel", "Xiaomi", "Redmi", "Poco", "Huawei", "Honor", "Nokia", "Oppo", "Vivo", "Realme", "Google", "Motorola", "OnePlus", "Nothing", "ZTE", "TCL"],
    fields: ["Name", "Memory", "Processor", "Network", "Display", "Front Camera", "Rear Camera", "Battery", "Charging", "Operating System", "FreeLink", "Infrared Remote Control", "Water & Dust Resistance", "Drop Resistance", "Main Camera Sensor", "Memory Card Slot", "Bluetooth", "Positioning", "NFC", "Infrared Port", "Radio", "USB", "Fingerprint Sensor", "SIM Slot"]
  },
  Laptops: {
    brands: ["HP", "Dell", "Lenovo", "Apple", "ASUS", "Acer", "MSI", "Samsung", "Huawei", "Microsoft", "LG", "Toshiba", "Fujitsu", "Panasonic", "Dynabook", "Chuwi", "Teclast", "Gigabyte", "Alienware", "Razer"],
    fields: ["Name", "Operating System", "OS Manufacturer", "System Manufacturer", "System Model", "System Type", "Processor", "Storage Type", "System Storage", "System Resolution", "Graphics Type", "Graphics Memory", "Camera", "Connectivity", "RAM Type", "RAM Size", "Screen Size"]
  },
  Fridge: {
    brands: ["Nasco", "Hisense", "LG", "Samsung", "Midea", "Nexus", "Bruhm", "Scanfrost", "Westpoint", "Haier", "Beko", "Sharp", "Panasonic", "Whirlpool", "Bosch", "Royal", "Daewoo", "Electrolux", "Binatone"],
    fields: ["Name", "Refrigerator/Freezer Type", "Manufacturer", "Model Identifier", "Climate Class", "Frozen Compartment Volume", "Chill Compartment Volume", "Noise Emission Class", "Refrigerant", "Global Warming Potential (GWP)", "Country of Origin", "Annual Energy Consumption", "Energy Rating"]
  },
  Speakers: {
    brands: ["JBL", "Oraimo", "Sony", "LG", "Samsung", "Anker", "Hisense", "Nasco", "Bruhm", "Skyworth", "Binatone", "Philips", "Harman Kardon", "Bose", "Marshall", "Tribit", "Xiaomi", "Hoco", "Remax", "Zealot"],
    fields: ["Name", "USB Port", "Aux-in", "Battery Capacity", "Light Modes", "Water Resistance", "Series", "Bluetooth"]
  },
  "Air Conditions": {
    brands: ["Hisense", "LG", "Samsung", "Midea", "Nasco", "Bruhm", "Nexus", "Daikin", "Gree", "TCL", "Haier", "Panasonic", "Sharp", "Carrier", "York", "Chigo", "Scanfrost", "Westpoint", "Royal", "Skyworth"],
    fields: ["Skyworth AC (2.5HP) 24V", "Air conditioner type: Split", "Trademark: Skyworth", "Model Identifier Indoor Unit: SMFC18V-5C111NA(I)AC", "Model Identifier Outdoor Unit: SMFC18V-5C111NA(O)", "AC Cooling Capacity: 4.90 kW/hr", "Compressor Type: Fixed", "Noise Level (Indoor/Outdoor): 45/55 dB", "AEER: 3.82", "TCSPF: 3.87", "Refrigerant: R410A", "Global Warming Potential: 2088", "Total Energy Consumption: 2174 kWh/year", "Fast Cooling", "Low Noise", "Energy Saving", "Anti-Rust Coating", "Turbo Air", "Smart Functions", "Eco Save Energy", "Tropical Compressor", "Dual Purifiers"]
  },
  "Washing Machines": {
    brands: ["Hisense", "LG", "Samsung", "Midea", "Nasco", "Bruhm", "Nexus", "Daikin", "Gree", "TCL", "Haier", "Panasonic", "Sharp", "Carrier", "York", "Chigo", "Scanfrost", "Westpoint", "Royal", "Skyworth"],
    fields: ["Brand", "Horsepower", "Voltage", "Air Conditioner Type", "Indoor Unit Model", "Outdoor Unit Model", "Cooling Capacity", "Compressor Type", "Noise Level", "AEER", "TCSPF", "Refrigerant", "Global Warming Potential", "Annual Energy Consumption", "Fast Cooling", "Low Noise", "Energy Saving", "Anti-Rust Coating", "Turbo Air", "Smart Functions", "Eco Save Energy", "Tropical Compressor", "Dual Purifiers"]
  },
  Accessories: {
    brands: ["Pendrives", "Hair Clipper", "Phone Covers", "Hard Drive", "Power Bank", "Battery", "Cables", "Handsfree", "Mouse", "CCTV Camera", "Smart Watch", "Charger", "Micro SD", "WiFi Router"],
    fields: []
  }
};

const ACCESSORY_SPECIFIC = {
  Pendrives: ["Name", "Compliant USB Version Specs", "Driverless Config Win ME/2000/XP/7", "Win 98/98SE Driver Support", "Driverless Config Mac OS 10.2.8+"],
  "Phone Covers": ["Name", "Silicon Variant Fitment Layer", "Magsafe & Camera Compatibility", "Crossbody Strap Attachment"],
  "Hair Clipper": ["Name", "Blade Type", "Battery Run Time", "Charging Speed", "Comb Lengths Available"],
  "Hard Drive": ["Name", "Storage Size", "Interface Protocol Type", "Transfer Speeds", "Form Factor Size"],
  "Power Bank": ["Name", "Battery Capacity Output", "Fast Charge Standards", "Port Allocations Count", "Safety Overload Chips"],
  Battery: ["Name", "Cell Chemistry", "Voltage Density", "Amp Hours Value", "Compatibility Matrix"],
  Cables: ["Name", "Connector Terminals Type", "Length Measurements", "Braiding Protection", "Power Throughput Limit"],
  Handsfree: ["Name", "Acoustic Driver Dimensions", "Wired or Wireless Profile", "Microphone Sensitivity", "Inline Controls Layout"],
  Mouse: ["Name", "DPI Tracking Engine", "Button Matrix Counts", "Ergonomics Structural Shape", "Lighting Accents"],
  "CCTV Camera": ["Name", "Sensor Focal Capture", "Night Vision Infrared Distance", "Storage Loop Protocols", "Weatherproofing Rating"],
  "Smart Watch": ["Name", "Display Geometry Face", "Biometric Sensors Stack", "Activity Tracking Metrics", "Battery Lifespan Target"],
  Charger: ["Name", "Total Wattage Distribution", "Port Form Configurations", "Safety Protocol Layers", "Wall Socket Standards"],
  "Micro SD": ["Name", "Storage Densities Size", "Speed Class Rating Matrix", "Read Write Rates Target", "Shockproof Ratings"],
  "WiFi Router": ["Name", "Wireless Standards Supported", "Antenna Signal Bands", "Ethernet Port Arrays", "Security Encryption Target"]
};

// FIXED: Accept both 'productToEdit' and 'product' to completely prevent undefined errors
export default function UpdateProduct({ productToEdit, product, onClose, onRefresh }) {
  const activeProduct = productToEdit || product;

  // Safe initialization fallbacks to prevent rendering crashes
  const [formData, setFormData] = useState({
    name: activeProduct?.name || '',
    brand: activeProduct?.brand || '',
    price: Math.round(Number(activeProduct?.price) || 0),
    stock: activeProduct?.stock || '',
    category: activeProduct?.category || 'Television',
    description: activeProduct?.description || '',
    rating: String(activeProduct?.rating || '1')
  });

  const [dynamicSpecs, setDynamicSpecs] = useState({});
  const [existingImages, setExistingImages] = useState(activeProduct?.images || []);
  const [newImages, setNewImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync profile data when component bounds map
  useEffect(() => {
    if (activeProduct) {
      setFormData({
        name: activeProduct.name || '',
        brand: activeProduct.brand || '',
        price: Math.round(Number(activeProduct.price) || 0),
        stock: activeProduct.stock || '',
        category: activeProduct.category || 'Television',
        description: activeProduct.description || '',
        rating: String(activeProduct.rating || '1')
      });

      setExistingImages(activeProduct.images || []);

      if (activeProduct.specifications && Array.isArray(activeProduct.specifications)) {
        const savedSpecs = {};
        activeProduct.specifications.forEach(item => {
          savedSpecs[item.key] = item.value;
        });
        setDynamicSpecs(savedSpecs);
      }
    }
  }, [activeProduct]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'category') {
      const fallbackBrand = CATEGORY_CONFIG[value]?.brands[0] || '';
      setFormData(prev => ({ ...prev, category: value, brand: fallbackBrand }));
      return;
    }

    if (name === 'rating') {
      const numVal = parseInt(value, 10);
      if (numVal > 5) return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSpecChange = (field, value) => {
    setDynamicSpecs(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (newImages.length + files.length > 6 || files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
        setErrorMsg('Choose up to 6 JPEG, PNG, or WebP images (5 MB maximum each).');
        e.target.value = '';
        return;
      }
      setErrorMsg('');
      setNewImages((previous) => [...previous, ...files]);
    }
  };

  const removeSelectedNewImage = (indexToRemove) => {
    setNewImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const removeExistingImage = (indexToRemove) => {
    setExistingImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const getImageUrlPreview = (imgStr) => {
    if (!imgStr) return '';
    return resolveApiAssetUrl(imgStr.replace(/\\/g, '/'));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const id = activeProduct?._id || activeProduct?.id;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const data = new FormData();

      data.append('name', formData.name);
      data.append('brand', formData.brand);
      data.append('category', formData.category);
      data.append('description', formData.description);
      data.append('price', Math.round(Number(formData.price) || 0));
      data.append('stock', parseInt(formData.stock, 10) || 0);
      data.append('rating', parseInt(formData.rating, 10) || 1);

      data.append('existingImages', JSON.stringify(existingImages));

      // Map specifications object structure cleanly into back-end array fields
      const specificationsArray = Object.entries(dynamicSpecs).map(([key, value]) => ({
        key,
        value: value || "N/A"
      }));
      data.append('specifications', JSON.stringify(specificationsArray));

      newImages.forEach((image) => {
        data.append('images', image);
      });

      await axiosInstance.put(
        `/products-update/${id}`,
        data,
      );

      // Pass success alert toast text dynamically to trigger parent dashboard notification alerts
      onRefresh();
      onClose('Product modified successfully!');
    } catch (err) {
      console.error('Error updating product:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update product settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeProduct) return null;

  const currentBrands = CATEGORY_CONFIG[formData.category]?.brands || [];
  const currentFields = formData.category === 'Accessories'
    ? (ACCESSORY_SPECIFIC[formData.brand] || ["Name"])
    : (CATEGORY_CONFIG[formData.category]?.fields || []);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 select-none">

      {/* Dynamic styling tags loaded to instantly hide any visual scrollbars completely */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none !important; width: 0px !important; height: 0px !important; }
        .no-scrollbar { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      `}} />

      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-4 sm:p-6 relative max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] overflow-y-auto overscroll-contain no-scrollbar">
        <button
          onClick={() => onClose()}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Modify Product Specifications</h3>

        {errorMsg && (
          <div className="mb-4 text-sm font-medium text-red-600 bg-red-50 p-2.5 border border-red-200 rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Product Title</label>
            <input
              type="text"
              name="name"
              required
              maxLength={120}
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm cursor-pointer"
              >
                {Object.keys(CATEGORY_CONFIG).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Brand Selection</label>
              <select
                name="brand"
                required
                value={formData.brand}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm cursor-pointer"
              >
                {currentBrands.map((brnd) => (
                  <option key={brnd} value={brnd}>{brnd}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Price (GH₵)</label>
              <input
                type="number"
                name="price"
                required
                step="1"
                min="0"
                max="100000000"
                value={formData.price}
                onChange={handleChange}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Stock Units</label>
              <input
                type="number"
                name="stock"
                required
                min="0"
                max="1000000"
                step="1"
                value={formData.stock}
                onChange={handleChange}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Rating (1-5)</label>
              <input
                type="number"
                name="rating"
                required
                min="1"
                max="5"
                value={formData.rating}
                onChange={handleChange}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-semibold"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-2 rounded-lg border border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-500 font-medium">Visual Scorecard Preview:</span>
            <div className="flex gap-0.5">
              {Array.from({ length: parseInt(formData.rating, 10) || 0 }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description Spec</label>
            <textarea
              name="description"
              required
              rows="2"
              maxLength={5000}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm resize-none"
            />
          </div>

          {/* DYNAMIC SPECIFICATIONS GRID INJECTION */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide border-b pb-1 mb-2">
              Advanced Technical Specs ({formData.category})
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto overscroll-contain no-scrollbar bg-slate-50/50 p-3 rounded-lg border border-slate-100">
              {currentFields.map((field) => (
                <div key={field} className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-500 mb-0.5">{field}</label>
                  <input
                    type="text"
                    value={dynamicSpecs[field] || ''}
                    onChange={(e) => handleSpecChange(field, e.target.value)}
                    placeholder={`Specify ${field.toLowerCase()}...`}
                    className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
              ))}
              {currentFields.length === 0 && (
                <p className="col-span-2 text-center text-xs italic text-gray-400 py-2">Select accessories matrix configurations.</p>
              )}
            </div>
          </div>

          {existingImages.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Active Saved Images ({existingImages.length})</label>
              <div className="grid grid-cols-5 gap-2 border bg-slate-50 p-2 rounded-lg max-h-24 overflow-y-auto no-scrollbar">
                {existingImages.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded border bg-white overflow-hidden group">
                    <img src={getImageUrlPreview(img)} alt="Server asset preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute inset-0 bg-rose-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Upload Additional Images</label>
            <div className="flex flex-col items-center justify-center w-full h-16 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors relative">
              <div className="flex flex-col items-center justify-center text-center px-2 pointer-events-none">
                <Upload className="w-4 h-4 text-gray-400 mb-0.5" />
                <p className="text-[11px] text-gray-500 font-medium">
                  {newImages.length > 0 ? `${newImages.length} staging files chosen` : "Choose files to add images"}
                </p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>

            {newImages.length > 0 && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto p-1.5 bg-slate-50 border border-slate-100 rounded-lg no-scrollbar">
                {newImages.map((file, index) => (
                  <div key={index} className="relative w-9 h-9 rounded border border-gray-300 bg-white flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-gray-400">FILE</span>
                    <button
                      type="button"
                      onClick={() => removeSelectedNewImage(index)}
                      className="absolute -top-1 -right-1 bg-gray-500 text-white rounded-full p-0.5 hover:bg-gray-700 cursor-pointer transition"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 rounded-lg transition mt-2 flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Configuration...
              </>
            ) : (
              'Apply Changes'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
