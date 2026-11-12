import React, { useState, useEffect } from 'react';
import axiosInstance from '../../lib/axios';
import { X, Upload, Star } from 'lucide-react';

// MASTER DATA DICTIONARY CONFIGURATION MATRIX
const CATEGORY_CONFIG = {
  Phones: {
    brands: ["Samsung", "Apple", "Tecno", "Infinix", "itel", "Xiaomi", "Redmi", "Poco", "Huawei", "Honor", "Nokia", "Oppo", "Vivo", "Realme", "Google", "Motorola", "OnePlus", "Nothing", "ZTE", "TCL"],
    fields: ["Model", "Operating System", "Screen Size", "Display Type", "Resolution", "Refresh Rate", "Processor", "RAM", "Storage", "Expandable Storage", "Rear Camera", "Front Camera", "Battery Capacity", "Charging Speed", "Wireless Charging", "SIM Type", "Network (2G/3G/4G/5G)", "Fingerprint Sensor", "Face Unlock", "Bluetooth Version", "Wi-Fi", "NFC", "USB Type", "Color", "Weight", "Dimensions", "Warranty"]
  },
  Laptops: {
    brands: ["HP", "Dell", "Lenovo", "Apple", "ASUS", "Acer", "MSI", "Samsung", "Huawei", "Microsoft", "LG", "Toshiba", "Fujitsu", "Panasonic", "Dynabook", "Chuwi", "Teclast", "Gigabyte", "Alienware", "Razer"],
    fields: ["Brand", "Model", "Processor", "Processor Generation", "RAM", "Storage Type", "Storage Capacity", "Graphics Card", "Operating System", "Screen Size", "Resolution", "Refresh Rate", "Touchscreen", "Keyboard Backlight", "Battery Life", "Ports", "Wi-Fi", "Bluetooth", "Webcam", "Speaker", "Weight", "Color", "Warranty"]
  },
  Television: {
    brands: ["Samsung", "LG", "Hisense", "TCL", "Nasco", "Bruhm", "Skyworth", "Sony", "Syinix", "Nexus", "Sharp", "Panasonic", "Toshiba", "Philips", "Changhong", "Haier", "Midea", "Royal", "Ailyons", "Vision"],
    fields: ["Model", "Screen Size", "Display Type", "Resolution", "Refresh Rate", "Smart TV", "Operating System", "HDR Support", "HDMI Ports", "USB Ports", "Bluetooth", "Wi-Fi", "Ethernet", "Audio Output", "Power Consumption", "Wall Mount Support", "Remote Included", "Warranty"]
  },
  Fridge: {
    brands: ["Nasco", "Hisense", "LG", "Samsung", "Midea", "Nexus", "Bruhm", "Scanfrost", "Westpoint", "Haier", "Beko", "Sharp", "Panasonic", "Whirlpool", "Bosch", "Royal", "Daewoo", "Electrolux", "Binatone"],
    fields: ["Model", "Capacity (Litres)", "Door Type", "Defrost Type", "Compressor Type", "Energy Rating", "Cooling Technology", "Temperature Control", "Water Dispenser", "Ice Maker", "Shelves", "Power Consumption", "Dimensions", "Weight", "Color", "Warranty"]
  },
  "Air Conditions": {
    brands: ["Hisense", "LG", "Samsung", "Midea", "Nasco", "Bruhm", "Nexus", "Daikin", "Gree", "TCL", "Haier", "Panasonic", "Sharp", "Carrier", "York", "Chigo", "Scanfrost", "Westpoint", "Royal", "Skyworth"],
    fields: ["Model", "Type", "Horse Power (HP)", "Cooling Capacity", "Energy Rating", "Inverter", "Refrigerant Type", "Power Consumption", "Remote Control", "Wi-Fi Control", "Timer", "Turbo Mode", "Noise Level", "Voltage", "Color", "Warranty"]
  },
  "Washing Machines": {
    brands: ["Hisense", "LG", "Samsung", "Midea", "Nasco", "Bruhm", "Nexus", "Panasonic", "Sharp", "Haier", "Scanfrost", "Westpoint", "Royal"],
    fields: ["Type", "Capacity", "Loading Type", "Spin Speed", "Energy Rating", "Number of Programs", "Digital Display", "Child Lock", "Delay Timer", "Water Consumption", "Power Consumption", "Color", "Dimensions", "Weight", "Warranty"]
  },
  Accessories: {
    brands: ["Charger", "Cable", "Power Bank", "Battery", "Phone Cover", "Mouse", "Smart Watch", "Headphones / Earbuds", "Wi-Fi Router", "Micro SD Card", "Hard Drive / SSD"],
    fields: []
  },
  Speaker: {
    brands: ["JBL", "Bose", "Sony", "Harman Kardon", "Marshall", "Anker Soundcore", "Ultimate Ears (UE)", "Sonos", "Zebronics", "Boat", "Portronics", "Philips", "Panasonic", "Yamaha", "Logitech", "Samsung", "LG"],
    fields: ["Speaker Type", "Sound Output (RMS)", "Channel Configuration", "Connectivity Type", "Bluetooth Version", "Battery Life", "Charging Port", "Waterproof Rating", "Built-in Microphone", "RGB Lighting", "FM Radio Support", "Color", "Warranty"]
  }
};

const ACCESSORY_SPECIFIC = {
  Charger: ["Type", "Power Output", "Fast Charging", "Port Type", "Cable Included", "Cable Length", "Color", "Warranty"],
  Total: ["Cable Type", "Connector", "Length", "Fast Charging", "Data Transfer", "Color", "Warranty"],
  "Power Bank": ["Capacity", "Output Ports", "Input Ports", "Fast Charging", "Wireless Charging", "LED Indicator", "Weight", "Warranty"],
  Battery: ["Battery Type", "Capacity", "Voltage", "Rechargeable", "Compatibility", "Warranty"],
  "Phone Cover": ["Compatible Device", "Material", "Color", "Shockproof", "Water Resistant", "Wireless Charging Support"],
  Mouse: ["Type", "Connection", "DPI", "Buttons", "RGB Lighting", "Battery Life", "Warranty"],
  "Smart Watch": ["Brand", "Model", "Display", "Screen Size", "Battery Life", "Operating System", "Heart Rate Monitor", "GPS", "Bluetooth", "Water Resistance", "Compatibility", "Warranty"],
  "Headphones / Earbuds": ["Brand", "Type", "Connection", "Bluetooth Version", "Battery Life", "Noise Cancellation", "Microphone", "Water Resistance", "Charging Port", "Warranty"],
  "Wi-Fi Router": ["Brand", "Model", "Wi-Fi Standard", "Speed", "Frequency", "Number of Antennas", "LAN Ports", "WAN Port", "Coverage", "Security", "Warranty"],
  "Micro SD Card": ["Brand", "Capacity", "Speed Class", "Read Speed", "Write Speed", "Adapter Included", "Warranty"],
  "Hard Drive / SSD": ["Brand", "Storage Capacity", "Type", "Interface", "Read Speed", "Write Speed", "Compatibility", "Warranty"]
};

const SPEC_OPTIONS_MAP = {
  "screen size": ['4.7"', '5.0"', '5.2"', '5.4"', '5.5"', '5.7"', '5.8"', '5.9"', '6.0"', '6.1"', '6.2"', '6.3"', '6.4"', '6.5"', '6.55"', '6.6"', '6.67"', '6.7"', '6.73"', '6.74"', '6.78"', '6.8"', '6.82"', '6.9"', '7.0"'],
  "resolution": ["HD (720 × 1600)", "HD+ (720 × 1612)", "HD+ (720 × 1650)", "FHD (1080 × 1920)", "FHD+ (1080 × 2340)", "FHD+ (1080 × 2400)", "FHD+ (1080 × 2460)", "FHD+ (1080 × 2520)", "FHD+ (1116 × 2556)", "FHD+ (1170 × 2532)", "QHD (1440 × 2560)", "QHD+ (1440 × 3040)", "QHD+ (1440 × 3120)", "QHD+ (1440 × 3200)", "2K (1220 × 2712)"],
  "processor": ["Apple A15 Bionic", "Apple A16 Bionic", "Apple A17 Pro", "Apple A18", "Apple A18 Pro", "Qualcomm Snapdragon 680", "Qualcomm Snapdragon 695", "Qualcomm Snapdragon 6 Gen 1", "Qualcomm Snapdragon 7 Gen 1", "Qualcomm Snapdragon 7 Gen 3", "Qualcomm Snapdragon 7+ Gen 3", "Qualcomm Snapdragon 8 Gen 1", "Qualcomm Snapdragon 8+ Gen 1", "Qualcomm Snapdragon 8 Gen 2", "Qualcomm Snapdragon 8 Gen 3", "Qualcomm Snapdragon 8 Elite", "MediaTek Helio G85", "MediaTek Helio G88", "MediaTek Helio G91", "MediaTek Helio G99", "MediaTek Helio G100", "MediaTek Dimensity 6100+", "MediaTek Dimensity 7020", "MediaTek Dimensity 7200", "MediaTek Dimensity 7300", "MediaTek Dimensity 8200", "MediaTek Dimensity 8300", "MediaTek Dimensity 9300", "MediaTek Dimensity 9400", "Google Tensor G2", "Google Tensor G3", "Google Tensor G4", "Samsung Exynos 1380", "Samsung Exynos 1480", "Samsung Exynos 2400", "Huawei Kirin 9000S", "Huawei Kirin 9010", "Unisoc T606", "Unisoc T612", "Unisoc T620", "Unisoc T760"],
  "ram": ["2GB","NA", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB", "18GB", "24GB"],
  "rear camera": ["8 MP", "12 MP", "13 MP", "16 MP", "20 MP", "24 MP", "32 MP", "48 MP", "50 MP", "64 MP", "100 MP", "108 MP", "200 MP"],
  "front camera": ["5 MP", "8 MP", "10 MP", "12 MP", "13 MP", "16 MP", "20 MP", "24 MP", "32 MP", "40 MP", "44 MP", "50 MP", "60 MP"],
  "sim type": ["Single Nano SIM", "Dual Nano SIM", "Nano SIM + eSIM", "Dual Nano SIM + eSIM", "Dual eSIM", "Single SIM (Micro SIM)", "Dual SIM (Micro SIM)", "Single SIM (Mini SIM)", "Hybrid SIM Slot (SIM + microSD)", "Dual SIM + Dedicated microSD Slot"],
  "network (2g/3g/4g/5g)": ["2G", "3G", "4G LTE", "4G LTE Advanced", "5G NSA (Non-Standalone)", "5G SA (Standalone)", "2G / 3G / 4G", "3G / 4G", "4G / 5G", "2G / 3G / 4G / 5G"],
  "network": ["2G", "3G", "4G LTE", "4G LTE Advanced", "5G NSA (Non-Standalone)", "5G SA (Standalone)", "2G / 3G / 4G", "3G / 4G", "4G / 5G", "2G / 3G / 4G / 5G"],
  "face unlock": ["Face ID", "2D Face Unlock", "3D Face Unlock", "AI Face Unlock", "Infrared Face Unlock", "No Face Unlock"],
  "color": ["Black", "White", "Silver", "Gray", "Blue", "Navy Blue", "Sky Blue", "Green", "Mint Green", "Red", "Pink", "Purple", "Lavender", "Gold", "Rose Gold", "Champagne Gold", "Titanium", "Natural Titanium", "Desert Titanium", "White Titanium", "Black Titanium", "Blue Titanium", "Graphite", "Midnight", "Starlight", "Space Gray", "Space Black", "Phantom Black", "Phantom White", "Cream", "Beige", "Yellow", "Orange", "Brown", "Coral", "Turquoise", "Violet", "Lime Green"],
  "weight": ["135 g", "140 g", "145 g", "150 g", "155 g", "160 g", "165 g", "170 g", "175 g", "180 g", "185 g", "190 g", "195 g", "200 g", "205 g", "210 g", "215 g", "220 g", "225 g", "230 g", "235 g", "240 g", "245 g", "250 g", "255 g", "260 g", "265 g", "270 g", "275 g", "280 g", "285 g", "290 g", "295 g", "300 g"],
  "dimensions": ["138.4 × 67.3 × 7.3 mm", "144.0 × 71.4 × 7.8 mm", "146.7 × 71.5 × 7.7 mm", "147.6 × 71.6 × 7.8 mm", "149.6 × 71.5 × 8.3 mm", "151.7 × 71.2 × 7.9 mm", "152.8 × 72.0 × 8.5 mm", "154.9 × 74.8 × 7.9 mm", "156.1 × 73.2 × 8.3 mm", "158.2 × 76.7 × 8.2 mm", "160.3 × 74.3 × 8.1 mm", "161.2 × 74.4 × 7.9 mm", "162.4 × 75.8 × 8.4 mm", "163.3 × 75.3 × 8.2 mm", "164.2 × 76.1 × 8.3 mm", "165.5 × 76.8 × 8.5 mm", "166.1 × 77.2 × 8.4 mm"],
  "warranty": ["No Warranty", "7 Days Seller Warranty", "14 Days Seller Warranty", "30 Days Seller Warranty", "3 Months", "6 Months", "1 Year", "18 Months", "2 Years", "3 Years", "5 Years", "Lifetime Warranty"],
  "storage": ["2GB", "4GB","NA", "8GB", "16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"],
  "operating system": ["Android 15 Vanilla System", "Android 14 System Core", "iOS 18 Ecosystem Core", "iOS 17 Structural Baseline", "Windows 11 Pro 64-Bit", "Windows 11 Home Edition", "macOS Sequoia", "Linux Ubuntu Server Edition"],
  "display type": ["Super AMOLED Infinite Display", "Dynamic OLED Panel Surface", "IPS Liquid Crystal Responsive Screen", "QLED Quantum Dot Backlit Grid Display"],
  "refresh rate": ["144Hz Hyper-Fluid Dynamic", "120Hz Smooth Action Processing", "90Hz Rapid Scroll Module", "60Hz Standard Frame Frequency"],
  "battery capacity": ["3000 mAh Compact Core", "4000 mAh Everyday Performance", "5000 mAh High Stamina Core", "6000 mAh Ultra Power Vault"],
  "charging speed": ["120W HyperCharge Mode", "67W Fast Data Delivery", "45W SuperFast Protocol", "25W Fast Intake", "15W Standard Charging Line"],
  "wireless charging": ["Wireless Power Qi Fast Charge Circuit Active", "Wired Cable Charging Exclusive Path"],
  "expandable storage": ["MicroSD Card Supported (Up to 1TB Ext)", "MicroSD Card Supported (Up to 512GB Ext)", "No Expandable Hardware Slot Configuration"],
  "fingerprint sensor": ["Under-Display Ultrasonic Biometric Tracking Node", "Side-Mounted Physical Power-Key Scanning Switch", "No Fingerprint Hardware Component Installed"],
  "bluetooth version": ["Bluetooth 5.4 Low-Latency Multi-Point Link", "Bluetooth 5.3 High Stability Core Module", "Bluetooth 5.0 Legacy Standard Platform"],
  "wi-fi": ["Wi-Fi 7 Enterprise Scale - 802.11be", "Wi-Fi 6E Tri-Band High Throughput - 802.11ax", "Wi-Fi 6 Smart Home Connectivity - 802.11ax"],
  "nfc": ["NFC Contactless Antenna Array Module Installed", "No NFC Contactless Wireless Chip Mounted"],
  "usb type": ["Type-C USB 3.2 High-Speed Port Interface", "Type-C USB 2.0 Balanced Ingestion Layout", "Lightning Proprietary Interface Bus Track"]
};

// Isolated option arrays for Television configurations only
const TV_SPEC_OPTIONS = {
  "screen size": ["19-inch", "22-inch", "24-inch", "28-inch", "32-inch", "40-inch", "42-inch", "43-inch", "48-inch", "50-inch", "55-inch", "58-inch", "60-inch", "65-inch", "70-inch", "75-inch", "77-inch", "83-inch", "85-inch", "86-inch", "88-inch", "97-inch", "98-inch", "100-inch", "110-inch", "115-inch"],
  "resolution": ["HD (1366 × 768)", "Full HD (1920 × 1080)", "2K (2048 × 1080)", "4K UHD (3840 × 2160)", "4K DCI (4096 × 2160)", "5K (5120 × 2880)", "8K UHD (7680 × 4320)"],
  "hdr support": ["No HDR", "HDR10", "HDR10+", "HDR10+ Adaptive", "HDR10+ Gaming", "Dolby Vision", "Dolby Vision IQ", "HLG (Hybrid Log-Gamma)", "Advanced HDR by Technicolor"],
  "usb ports": ["No USB Port", "1 x USB 2.0", "2 x USB 2.0", "3 x USB 2.0", "1 x USB 3.0", "2 x USB 3.0", "3 x USB 3.0", "1 x USB-C", "2 x USB-C", "1 x USB 2.0 + 1 x USB 3.0", "2 x USB 2.0 + 1 x USB 3.0", "2 x USB 3.0 + 1 x USB-C", "2 x USB 2.0 + 2 x USB 3.0", "2 x USB 3.0 + 2 x USB-C"],
  "power consumption": ["< 30W", "30W", "40W", "50W", "60W", "70W", "80W", "90W", "100W", "110W", "120W", "130W", "140W", "150W", "160W", "170W", "180W", "190W", "200W", "220W", "250W", "300W", "350W", "400W", "450W", "500W", "> 500W"],
  "wall mount support": ["Not Supported", "Supported", "VESA 75 × 75 mm", "VESA 100 × 100 mm", "VESA 100 × 200 mm", "VESA 200 × 100 mm", "VESA 200 × 200 mm", "VESA 300 × 200 mm", "VESA 300 × 300 mm", "VESA 400 × 200 mm", "VESA 400 × 300 mm", "VESA 400 × 400 mm", "VESA 600 × 400 mm", "VESA 800 × 400 mm", "VESA 800 × 600 mm"],
  "remote included": ["No Remote Included", "Standard IR Remote", "Voice Remote", "Smart Remote", "SolarCell Remote", "Magic Remote", "Bluetooth Remote", "Rechargeable Remote", "Premium Smart Remote"],
  "processor": ["Quad-Core Processor", "Quad-Core 4K Processor", "Crystal Processor 4K", "Crystal Processor 4K+", "NQ4 AI Gen2 Processor", "NQ4 AI Gen3 Processor", "NQ8 AI Gen2 Processor", "NQ8 AI Gen3 Processor", "α5 AI Processor Gen7", "α5 AI Processor Gen8", "α7 AI Processor Gen7", "α7 AI Processor Gen8", "α9 AI Processor Gen7", "α9 AI Processor Gen8", "Cognitive Processor XR", "XR Processor", "Pentonic 700", "Pentonic 1000", "Pentonic 2000", "AiPQ Processor", "AiPQ Pro Processor", "VIDAA Smart Processor", "X1 Processor", "X1 Ultimate Processor", "Neo Quantum Processor 4K", "Neo Quantum Processor 8K"],
  "smart tv": ["No", "Yes"],
  "operating system": ["Not Smart", "Android TV", "Google TV", "Tizen OS", "webOS", "VIDAA OS", "Fire TV OS", "Roku TV OS", "Titan OS", "HarmonyOS", "Saphi OS", "Linux OS", "My Home Screen", "Xiaomi PatchWall", "Coolita OS"],
  "hdmi ports": ["No HDMI Port", "1 x HDMI", "2 x HDMI", "3 x HDMI", "4 x HDMI", "5 x HDMI", "1 x HDMI 2.0", "2 x HDMI 2.0", "3 x HDMI 2.0", "4 x HDMI 2.0", "1 x HDMI 2.1", "2 x HDMI 2.1", "3 x HDMI 2.1", "4 x HDMI 2.1", "2 x HDMI 2.0 + 2 x HDMI 2.1", "3 x HDMI 2.0 + 1 x HDMI 2.1"],
  "wi-fi": ["No Wi-Fi", "Wi-Fi 4 (802.11n)", "Wi-Fi 5 (802.11ac)", "Wi-Fi 6 (802.11ax)", "Wi-Fi 6E (802.11ax)", "Wi-Fi 7 (802.11be)", "Dual-Band Wi-Fi", "Tri-Band Wi-Fi"],
  "ethernet": ["No Ethernet Port", "1 x Ethernet (RJ45)", "2 x Ethernet (RJ45)", "Fast Ethernet (10/100 Mbps)", "Gigabit Ethernet (10/100/1000 Mbps)", "2.5 Gigabit Ethernet", "10 Gigabit Ethernet"],
  "audio output": ["10W", "16W", "20W", "24W", "30W", "40W", "50W", "60W", "70W", "80W", "90W", "100W", "120W"],
  "bluetooth": ["Not Supported", "Bluetooth 4.2", "Bluetooth 5.0", "Bluetooth 5.1", "Bluetooth 5.2", "Bluetooth 5.3", "Bluetooth 5.4"]
};

export default function AddProduct({ onClose, onRefresh, productToEdit }) {
  const isEditMode = !!productToEdit;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'Television',
    brand: '',
    rating: '1',
    newArrival: false
  });

  const [dynamicSpecs, setDynamicSpecs] = useState({});
  const [selectedImages, setSelectedImages] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  // Synchronized mapping system hooks for edit triggers
  useEffect(() => {
    if (isEditMode && productToEdit) {
      setFormData({
        name: productToEdit.name || '',
        description: productToEdit.description || '',
        price: Math.round(Number(productToEdit.price) || 0),
        stock: productToEdit.stock || '',
        category: productToEdit.category || 'Television',
        brand: productToEdit.brand || '',
        rating: String(productToEdit.rating || '1'),
        newArrival: productToEdit.newArrival === true || productToEdit.newArrival === "true"
      });

      if (productToEdit.specifications && Array.isArray(productToEdit.specifications)) {
        const savedSpecs = {};
        productToEdit.specifications.forEach(item => {
          savedSpecs[item.key] = item.value;
        });
        setDynamicSpecs(savedSpecs);
      }
    } else {
      const currentCategory = formData.category || 'Television';
      const availableBrands = CATEGORY_CONFIG[currentCategory]?.brands || [];
      setFormData(prev => ({ ...prev, brand: availableBrands[0] || '', newArrival: false }));
    }
  }, [productToEdit, isEditMode, formData.category]);

  useEffect(() => {
    if (isEditMode) return;

    const currentCategory = formData.category;
    const currentBrand = formData.brand;
    let targetFields = [];

    if (currentCategory === 'Accessories') {
      targetFields = ACCESSORY_SPECIFIC[currentBrand] || [];
    } else {
      targetFields = CATEGORY_CONFIG[currentCategory]?.fields || [];
    }

    const initialSpecs = {};
    targetFields.forEach(field => {
      const lookupKey = field.toLowerCase().trim();
      let options = ["Standard Component Variant Tag"];
      
      if (currentCategory === "Laptops") {
        if (lookupKey === "storage type") {
          options = ["SSD", "HDD", "eMMC", "UFS", "Hybrid (SSD + HDD)"];
        } else if (lookupKey === "storage capacity") {
          options = ["32GB", "64GB", "128GB", "256GB", "320GB", "500GB", "512GB", "750GB", "1TB", "2TB", "4TB", "6TB", "8TB"];
        } else if (lookupKey === "screen size") {
          options = ["10.1-inch", "10.5-inch", "11.0-inch", "11.6-inch", "12.0-inch", "12.1-inch", "12.3-inch", "12.4-inch", "12.5-inch", "13.0-inch", "13.3-inch", "13.4-inch", "13.5-inch", "13.6-inch", "13.9-inch", "14.0-inch", "14.2-inch", "14.5-inch", "15.0-inch", "15.3-inch", "15.4-inch", "15.6-inch", "16.0-inch", "16.1-inch", "16.2-inch", "17.0-inch", "17.3-inch", "18.0-inch"];
        } else if (lookupKey === "touchscreen" || lookupKey === "keyboard backlight") {
          options = ["YES", "NO"];
        } else if (lookupKey === "battery life") {
          options = ["Up to 4 hours", "Up to 5 hours", "Up to 6 hours", "Up to 7 hours", "Up to 8 hours", "Up to 9 hours", "Up to 10 hours", "Up to 11 hours", "Up to 12 hours", "Up to 13 hours", "Up to 14 hours", "Up to 15 hours", "Up to 16 hours", "Up to 17 hours", "Up to 18 hours", "Up to 19 hours", "Up to 20 hours", "Up to 21 hours", "Up to 22 hours", "Up to 24 hours", "Up to 26 hours", "Up to 28 hours", "Up to 30 hours", "2-cell Li-ion", "3-cell Li-ion", "4-cell Li-ion", "6-cell Li-ion", "8-cell Li-ion", "2-cell Li-Polymer", "3-cell Li-Polymer", "4-cell Li-Polymer", "6-cell Li-Polymer", "8-cell Li-Polymer", "38Wh Li-ion", "40Wh Li-ion", "41Wh Li-ion", "42Wh Li-ion", "45Wh Li-ion", "48Wh Li-ion", "50Wh Li-ion", "52Wh Li-ion", "54Wh Li-ion", "56Wh Li-ion", "57Wh Li-ion", "60Wh Li-ion", "63Wh Li-ion", "65Wh Li-ion", "68Wh Li-ion", "70Wh Li-ion", "72Wh Li-ion", "75Wh Li-ion", "80Wh Li-ion", "83Wh Li-ion", "86Wh Li-ion", "90Wh Li-ion", "93Wh Li-ion", "95Wh Li-ion", "99Wh Li-ion", "49.9Wh Li-Polymer", "56Wh Li-Polymer", "60Wh Li-Polymer", "70Wh Li-Polymer", "75Wh Li-Polymer", "84Wh Li-Polymer", "90Wh Li-Polymer", "99.5Wh Li-Polymer"];
        } else if (lookupKey === "ports") {
          options = ["USB 2.0", "USB 3.0 Type-A", "USB 3.1 Type-A", "USB 3.2 Gen 1 Type-A", "USB 3.2 Gen 2 Type-A", "USB Type-C", "USB Type-C 3.2 Gen 1", "USB Type-C 3.2 Gen 2", "USB Type-C 3.2 Gen 2x2", "USB4", "Thunderbolt 3", "Thunderbolt 4", "Thunderbolt 5", "HDMI 1.4", "HDMI 2.0", "HDMI 2.1", "DisplayPort", "Mini DisplayPort", "VGA", "RJ-45 Ethernet", "3.5mm Audio Jack", "Microphone Jack", "Headphone/Microphone Combo Jack", "SD Card Reader", "microSD Card Reader", "Smart Card Reader", "SIM Card Slot", "Nano SIM Slot", "Kensington Lock Slot", "Docking Connector", "Proprietary Charging Port", "DC Power Input"];
        } else if (lookupKey === "webcam") {
          options = ["No Webcam", "480p VGA Webcam", "720p HD Webcam", "720p HD IR Webcam", "1080p Full HD Webcam", "1080p Full HD IR Webcam", "1440p QHD Webcam", "1440p QHD IR Webcam", "5MP Webcam", "5MP IR Webcam", "8MP Webcam", "Privacy Shutter", "Electronic Privacy Shutter (eShutter)", "Windows Hello IR Camera", "AI Camera", "AI IR Camera", "Dual Camera", "Ultra HD Webcam"];
        } else if (lookupKey === "speaker") {
          options = ["Mono Speaker", "Dual Stereo Speakers", "Quad Speakers", "Dolby Audio Speakers", "Dolby Atmos Speakers", "Harman Kardon Speakers", "Bang & Olufsen (B&O) Speakers", "Poly Studio Speakers", "JBL Speakers", "Dynaudio Speakers", "Nahimic Audio", "Tuned by AKG", "Tuned by Dolby", "Hi-Res Audio Speakers", "Smart Amplifier Speakers", "AI Noise-Canceling Speakers"];
        } else if (lookupKey === "operating system") {
          options = ["Windows 11 Home", "Windows 11 Pro", "Windows 11 Home Single Language", "Windows 10 Home", "Windows 10 Pro", "Windows 10 Pro Downgrade", "FreeDOS", "DOS", "Ubuntu", "Ubuntu LTS", "Linux", "ChromeOS", "ChromeOS Flex", "macOS Sequoia", "macOS Tahoe", "No Operating System"];
        } else if (lookupKey === "graphics card") {
          options = ["Intel UHD Graphics", "Intel Iris Xe Graphics", "Intel Arc Graphics", "Intel Arc 130V Graphics", "Intel Arc 140V Graphics", "Intel Arc 140T Graphics", "AMD Radeon Graphics", "AMD Radeon 660M", "AMD Radeon 680M", "AMD Radeon 740M", "AMD Radeon 760M", "AMD Radeon 780M", "AMD Radeon 880M", "AMD Radeon 890M", "Apple 8-core GPU", "Apple 10-core GPU", "Apple 16-core GPU", "Apple 20-core GPU", "Apple 32-core GPU", "Apple 40-core GPU", "NVIDIA GeForce RTX 5090 Laptop GPU", "NVIDIA GeForce RTX 5080 Laptop GPU", "NVIDIA GeForce RTX 5070 Ti Laptop GPU", "NVIDIA GeForce RTX 5070 Laptop GPU", "NVIDIA GeForce RTX 5060 Laptop GPU", "NVIDIA GeForce RTX 5050 Laptop GPU", "NVIDIA GeForce RTX 4090 Laptop GPU", "NVIDIA GeForce RTX 4080 Laptop GPU", "NVIDIA GeForce RTX 4070 Laptop GPU", "NVIDIA GeForce RTX 4060 Laptop GPU", "NVIDIA GeForce RTX 4050 Laptop GPU", "NVIDIA GeForce RTX 3080 Ti Laptop GPU", "NVIDIA GeForce RTX 3080 Laptop GPU", "NVIDIA GeForce RTX 3070 Ti Laptop GPU", "NVIDIA GeForce RTX 3070 Laptop GPU", "NVIDIA GeForce RTX 3060 Laptop GPU", "NVIDIA GeForce RTX 3050 Ti Laptop GPU", "NVIDIA GeForce RTX 3050 Laptop GPU", "NVIDIA GeForce GTX 1660 Ti", "NVIDIA GeForce GTX 1650", "NVIDIA GeForce GTX 1050 Ti", "NVIDIA GeForce GTX 1050", "NVIDIA RTX 5000 Ada Generation Laptop GPU", "NVIDIA RTX 4000 Ada Generation Laptop GPU", "NVIDIA RTX 3000 Ada Generation Laptop GPU", "NVIDIA RTX 2000 Ada Generation Laptop GPU", "NVIDIA RTX A5500 Laptop GPU", "NVIDIA RTX A5000 Laptop GPU", "NVIDIA RTX A4500 Laptop GPU", "NVIDIA RTX A4000 Laptop GPU", "NVIDIA RTX A3000 Laptop GPU", "NVIDIA RTX A2000 Laptop GPU", "AMD Radeon RX 7900M", "AMD Radeon RX 7700S", "AMD Radeon RX 7600S", "AMD Radeon RX 7600M XT", "AMD Radeon RX 7600M", "AMD Radeon RX 6850M XT", "AMD Radeon RX 6800M", "AMD Radeon RX 6700M", "AMD Radeon RX 6600M", "AMD Radeon RX 6550M", "AMD Radeon RX 6500M"];
        } else if (lookupKey === "processor generation") {
          options = ["Intel 8th Gen", "Intel 9th Gen", "Intel 10th Gen", "Intel 11th Gen", "Intel 12th Gen", "Intel 13th Gen", "Intel 14th Gen", "Intel Core Series 1", "Intel Core Series 2", "Intel Core Ultra Series 1", "Intel Core Ultra Series 2", "Intel Core Ultra Series 3", "AMD Ryzen 3000 Series", "AMD Ryzen 4000 Series", "AMD Ryzen 5000 Series", "AMD Ryzen 6000 Series", "AMD Ryzen 7000 Series", "AMD Ryzen 8000 Series", "AMD Ryzen AI 300 Series", "Apple M1", "Apple M1 Pro", "Apple M1 Max", "Apple M1 Ultra", "Apple M2", "Apple M2 Pro", "Apple M2 Max", "Apple M2 Ultra", "Apple M3", "Apple M3 Pro", "Apple M3 Max", "Apple M4", "Apple M4 Pro", "Apple M4 Max", "Snapdragon 8cx Gen 3", "Snapdragon X Plus", "Snapdragon X Elite"];
        } else if (lookupKey === "processor") {
          options = ["Intel Core Ultra 5 125H", "Intel Core Ultra 5 225H", "Intel Core Ultra 7 155H", "Intel Core Ultra 7 165H", "Intel Core Ultra 7 255H", "Intel Core Ultra 9 185H", "Intel Core Ultra 9 285H", "Intel Core i9-14900HX", "Intel Core i9-14900H", "Intel Core i9-13980HX", "Intel Core i9-13900HX", "Intel Core i9-12900HX", "Intel Core i7-14700HX", "Intel Core i7-14700H", "Intel Core i7-14650HX", "Intel Core i7-13700HX", "Intel Core i7-13700H", "Intel Core i7-13620H", "Intel Core i7-12700H", "Intel Core i7-12650H", "Intel Core i7-1255U", "Intel Core i7-1195G7", "Intel Core i5-14500HX", "Intel Core i5-14450HX", "Intel Core i5-13500H", "Intel Core i5-13420H", "Intel Core i5-1335U", "Intel Core i5-12500H", "Intel Core i5-12450H", "Intel Core i5-1235U", "Intel Core i5-1135G7", "Intel Core i3-1315U", "Intel Core i3-1215U", "Intel Core i3-1115G4", "Intel Pentium Gold 8505", "Intel N200", "Intel N100", "Intel Celeron N5100", "Intel Celeron N4500", "AMD Ryzen 9 9955HX", "AMD Ryzen 9 9955HX3D", "AMD Ryzen 9 8945HS", "AMD Ryzen 9 7945HX", "AMD Ryzen 9 7940HS", "AMD Ryzen 7 8845HS", "AMD Ryzen 7 8840HS", "AMD Ryzen 7 7840HS", "AMD Ryzen 7 7735HS", "AMD Ryzen 7 7730U", "AMD Ryzen 7 6800H", "AMD Ryzen 7 5800H", "AMD Ryzen 5 8645HS", "AMD Ryzen 5 8540U", "AMD Ryzen 5 7640HS", "AMD Ryzen 5 7535HS", "AMD Ryzen 5 7530U", "AMD Ryzen 5 6600H", "AMD Ryzen 5 5625U", "AMD Ryzen 5 5500U", "AMD Ryzen 3 7320U", "AMD Ryzen 3 5300U", "AMD Athlon Silver 7120U", "AMD Athlon Gold 7220U", "Snapdragon X Elite X1E-84-100", "Snapdragon X Elite X1E-80-100", "Snapdragon X Plus X1P-64-100", "Apple M1", "Apple M1 Pro", "Apple M1 Max", "Apple M2", "Apple M2 Pro", "Apple M2 Max", "Apple M3", "Apple M3 Pro", "Apple M3 Max", "Apple M4", "Apple M4 Pro", "Apple M4 Max"];
        } else {
          options = SPEC_OPTIONS_MAP[lookupKey] || SPEC_OPTIONS_MAP[field.toLowerCase()] || options;
        }
      } else if (currentCategory === "Television") {
        if (TV_SPEC_OPTIONS[lookupKey]) {
          options = TV_SPEC_OPTIONS[lookupKey];
        } else {
          options = SPEC_OPTIONS_MAP[lookupKey] || SPEC_OPTIONS_MAP[field.toLowerCase()] || options;
        }
      } else {
        options = SPEC_OPTIONS_MAP[lookupKey] || SPEC_OPTIONS_MAP[field.toLowerCase()] || options;
      }

      initialSpecs[field] = options[0] || '';
    });
    setDynamicSpecs(initialSpecs);
  }, [formData.category, formData.brand, isEditMode]);

  useEffect(() => {
    const frameTimer = setTimeout(() => setIsRendered(true), 10);
    return () => clearTimeout(frameTimer);
  }, []);

  const handleClosePanel = () => {
    setIsRendered(false);
    setTimeout(() => onClose(), 250);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'category') {
      const fallbackBrand = CATEGORY_CONFIG[value]?.brands[0] || '';
      setFormData(prev => ({ ...prev, category: value, brand: fallbackBrand }));
      return;
    }

    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSpecChange = (field, value) => {
    setDynamicSpecs(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const maxFiles = isEditMode ? 6 : 16;
      if (files.length > maxFiles || files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
        setErrorMsg(`Choose up to ${maxFiles} JPEG, PNG, or WebP images (5 MB maximum each).`);
        e.target.value = '';
        return;
      }
      setErrorMsg('');
      setSelectedImages(files);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('brand', formData.brand);
      data.append('price', Math.round(Number(formData.price) || 0));
      data.append('stock', parseInt(formData.stock, 10) || 0);
      data.append('rating', parseInt(formData.rating, 10) || 1);
      data.append('newArrival', formData.newArrival);
      data.append('shopId', 'STARTECH');

      const specificationsArray = Object.entries(dynamicSpecs).map(([key, value]) => ({
        key: key,
        value: value || "N/A"
      }));
      data.append('specifications', JSON.stringify(specificationsArray));

      selectedImages.forEach((image) => {
        data.append('images', image);
      });

      const endpoint = isEditMode
        ? `/products-update/${productToEdit._id}`
        : '/products';

      await axiosInstance({
        method: isEditMode ? 'put' : 'post',
        url: endpoint,
        data: data,
      });

      alert(isEditMode ? 'Product updated successfully!' : 'Product published successfully!');
      onRefresh();
      handleClosePanel();
    } catch (err) {
      console.error('Error handling product database commit:', err);
      setErrorMsg(err.response?.data?.message || 'Transaction compilation fault. Review backend logs.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentBrands = CATEGORY_CONFIG[formData.category]?.brands || [];
  const currentFields = formData.category === 'Accessories'
    ? (ACCESSORY_SPECIFIC[formData.brand] || [])
    : (CATEGORY_CONFIG[formData.category]?.fields || []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none overflow-hidden">
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isRendered ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClosePanel}
      />

      <div
        className={`relative w-full sm:w-[min(92vw,42rem)] lg:w-[35%] bg-slate-900 border-l border-slate-800 text-white h-[100dvh] shadow-2xl flex flex-col p-4 sm:p-6 z-10 transform transition-transform duration-300 ease-out ${isRendered ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <button
          type="button"
          onClick={handleClosePanel}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
          aria-label="Close form drawer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4 sm:mb-6 shrink-0 pr-8">
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {isEditMode ? 'Modify Item Specifications' : 'Create New Product'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isEditMode ? 'Review or modify data properties directly' : 'Select operational parameter tags below to publish items'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 text-sm font-medium text-red-400 bg-red-950/40 p-2.5 border border-red-900 rounded-lg text-center shrink-0">
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 pb-6 space-y-4 sm:space-y-6 custom-sidebar-scrollbar"
        >
          <style dangerouslySetInnerHTML={{
            __html: `
            form.custom-sidebar-scrollbar::-webkit-scrollbar { display: none !important; width: 0px !important; }
            form.custom-sidebar-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
            @media (min-width: 1024px) {
              form.custom-sidebar-scrollbar::-webkit-scrollbar { display: block !important; width: 4px !important; }
              form.custom-sidebar-scrollbar { scrollbar-width: thin; scrollbar-color: #4f46e5 #0f172a; }
              form.custom-sidebar-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
              form.custom-sidebar-scrollbar::-webkit-scrollbar-thumb { background: #4f46e5; border-radius: 10px; }
              form.custom-sidebar-scrollbar::-webkit-scrollbar-thumb:hover { background: #6366f1; }
            }
          `}} />

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-2">
              Core Item Details
            </h4>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Product Name</label>
              <input
                type="text"
                name="name"
                required
                maxLength={120}
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Samsung Galaxy S25 Ultra"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  {Object.keys(CATEGORY_CONFIG).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Brand</label>
                <select
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  {currentBrands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Price (GH₵)</label>
                <input
                  type="number"
                  name="price"
                  required
                  min="0"
                  max="100000000"
                  step="1"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Stock Qty</label>
                <input
                  type="number"
                  name="stock"
                  required
                  min="0"
                  max="1000000"
                  step="1"
                  value={formData.stock}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Star Rating</label>
                <div className="relative">
                  <select
                    name="rating"
                    value={formData.rating}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-amber-400 font-semibold focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>{num} Star{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="newArrival"
                name="newArrival"
                checked={formData.newArrival}
                onChange={handleChange}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="newArrival" className="text-xs font-medium text-slate-300 cursor-pointer">
                Mark as New Arrival Highlight Item
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
              <textarea
                name="description"
                rows="3"
                required
                maxLength={5000}
                value={formData.description}
                onChange={handleChange}
                placeholder="Detailed hardware summary or feature highlights..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>
          </div>

          {currentFields.length > 0 && (
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-2">
                Technical Specifications
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentFields.map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-slate-300 mb-1 truncate">{field}</label>
                    <input
                      type="text"
                      value={dynamicSpecs[field] || ''}
                      onChange={(e) => handleSpecChange(field, e.target.value)}
                      placeholder={`Enter ${field.toLowerCase()}`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-2">
              Product Images Gallery
            </h4>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500 bg-slate-950/50 rounded-xl p-6 cursor-pointer transition-colors group">
              <Upload className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 mb-2 transition-colors" />
              <span className="text-xs font-medium text-slate-300">Click to upload image files</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Supports PNG, JPG, WEBP (Multiple allowed)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {selectedImages.length > 0 && (
              <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <span>{selectedImages.length} image file(s) selected for upload</span>
                <span className="text-indigo-400 font-semibold">Ready</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex gap-3">
            <button
              type="button"
              onClick={handleClosePanel}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? 'Saving Item...' : (isEditMode ? 'Save Changes' : 'Publish Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
