import React, { useState } from 'react';
import { getCsrfToken } from '../../lib/csrf';
import { useNavigate } from 'react-router-dom'; // 👈 Added React Router Hook

// Get backend base URL from Vite environment variables with a fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const ShopRegister = () => {
  const navigate = useNavigate(); // 👈 Initialize navigation controller
  
  // Gatekeeper state to view the form
  const [hasAgreed, setHasAgreed] = useState(false);
  
  // Specific checkbox agreements required for e-commerce vendors
  const [checkboxes, setCheckboxes] = useState({
    terms: false,
    privacy: false,
    feeStructure: false,
  });

  // Form State
  const [formData, setFormData] = useState({
    shopName: '',
    description: '',
    category: '',
    email: '',
    number: '',
    password: '',
  });

  // File Upload State (Max 3 files allowed)
  const [files, setFiles] = useState([]);
  
  // Status feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle legal consent checking
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setCheckboxes((prev) => ({ ...prev, [name]: checked }));
  };

  // Move past legal step if everything is ticked
  const handleAcceptTerms = (e) => {
    e.preventDefault();
    if (checkboxes.terms && checkboxes.privacy && checkboxes.feeStructure) {
      setHasAgreed(true);
    }
  };

  // Handle text input field alterations
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle files selection & validations
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    if (selectedFiles.length > 3) {
      setError('You can upload a maximum of 3 certificate documents.');
      return;
    }

    const allPDFs = selectedFiles.every((file) => file.type === 'application/pdf');
    if (!allPDFs) {
      setError('Invalid file format. Only PDF documents are allowed.');
      return;
    }

    setError('');
    setFiles(selectedFiles);
  };

  // Handle Submit 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const dataToSend = new FormData();
    dataToSend.append('shopName', formData.shopName);
    dataToSend.append('description', formData.description);
    dataToSend.append('category', formData.category);
    dataToSend.append('email', formData.email);
    dataToSend.append('number', formData.number);
    dataToSend.append('password', formData.password);

    files.forEach((file) => {
      dataToSend.append('files', file); 
    });

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/create-shop`, {
        method: 'POST',
        body: dataToSend,
        credentials: 'include',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong during registration.');
      }

      setSuccess('Shop application request and documents submitted successfully! Redirecting...');
      
      // Reset form state variables
      setFormData({ shopName: '', description: '', category: '', email: '', number: '', password: '' });
      setFiles([]);

      // 👈 REDIRECT TO LOGIN AFTER A 2-SECOND DELAY
      setTimeout(() => {
        navigate('/auth/login');
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 1: TERMS & CONDITIONS GATEWAY SCREEN ---
  if (!hasAgreed) {
    const allChecked = checkboxes.terms && checkboxes.privacy && checkboxes.feeStructure;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
          <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
            Merchant Partner Agreement
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please read and review our e-commerce platform seller terms before creating your store.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
          <div className="bg-white py-8 px-6 shadow sm:rounded-lg border border-gray-200">
            
            {/* Scrollable Terms Content Box */}
            <div className="h-72 overflow-y-scroll border border-gray-200 rounded p-4 text-xs text-gray-600 space-y-4 bg-gray-50 mb-6 leading-relaxed">
              <h3 className="font-bold text-sm text-gray-800">1. Overview & Account Onboarding</h3>
              <p>
                By applying for a merchant storefront token, you certify that all business registrations, tax identifier declarations, and legal operation licenses submitted are legitimate and currently active with sovereign financial regulatory agencies.
              </p>

              <h3 className="font-bold text-sm text-gray-800">2. Merchant Code of Conduct</h3>
              <p>
                Vendors strictly agree not to list prohibited inventory assets including fraudulent goods, unlicensed safety gear, unauthorized tracking components, or illegal consumer substances. Misrepresentation of delivery dispatch timelines or fake shipping manifest payloads will cause immediate payout freezes and profile termination.
              </p>

              <h3 className="font-bold text-sm text-gray-800">3. Fee Layouts & Escrow Schedules</h3>
              <p>
                Platform services process standard commissions on items cleared via payment gates. Funds are captured securely via internal processing infrastructure and remain guarded within an escrow balance layer until shipment tracking numbers verify courier acceptance or a 72-hour trade resolution window passes without consumer dispute tickets.
              </p>

              <h3 className="font-bold text-sm text-gray-800">4. Document & Verification Security</h3>
              <p>
                All identity parameters and business certification documents provided in the subsequent registration steps will undergo rigorous validation checking. Admin reviewers reserve the explicit authority to hold application credentials pending complete clear status outcomes.
              </p>
            </div>

            <form onSubmit={handleAcceptTerms} className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    checked={checkboxes.terms}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="font-medium text-gray-700">
                    I accept the Merchant Terms of Service
                  </label>
                  <p className="text-gray-500 text-xs">I agree to platform rules, store policies, and listing procedures.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="privacy"
                    name="privacy"
                    type="checkbox"
                    checked={checkboxes.privacy}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="privacy" className="font-medium text-gray-700">
                    I accept the Privacy Policy
                  </label>
                  <p className="text-gray-500 text-xs">I allow the processing and secure storage of business certification paperwork.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="feeStructure"
                    name="feeStructure"
                    type="checkbox"
                    checked={checkboxes.feeStructure}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="feeStructure" className="font-medium text-gray-700">
                    I acknowledge the platform commission and escrow fees
                  </label>
                  <p className="text-gray-500 text-xs">I accept standard payout terms and store processing deductions.</p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={!allChecked}
                  className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition font-semibold ${
                    !allChecked ? 'opacity-40 cursor-not-allowed bg-gray-400 hover:bg-gray-400' : ''
                  }`}
                >
                  Proceed to Registration
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    );
  }

  // --- STEP 2: ACTUAL STORE REGISTRATION FORM (Unlocked upon Agreement) ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Register Your Business Shop
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Submit your details and legal certificates for review.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          
          {/* Status Banners */}
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded text-sm text-green-700 animate-pulse">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Shop Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Shop Name</label>
                <input
                  type="text"
                  name="shopName"
                  required
                  value={formData.shopName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Shop Category</label>
                <input
                  type="text"
                  name="category"
                  placeholder="e.g. Electronics, Clothing"
                  required
                  value={formData.category}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                rows="3"
                required
                value={formData.description}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            {/* Email & Contact Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                <input
                  type="text"
                  name="number"
                  required
                  value={formData.number}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Password</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            {/* PDF File Upload Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Business Certificates (PDF Format, Max 3 docs)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-gray-50 hover:bg-gray-100 transition">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20L28 8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label className="relative cursor-pointer bg-transparent rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                      <span>Upload files</span>
                      <input
                        type="file"
                        name="files"
                        multiple
                        accept=".pdf"
                        required
                        onChange={handleFileChange}
                        className="sr-only"
                        id="file-upload"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">Only PDF up to 3 elements</p>
                </div>
              </div>
              
              {/* Selected Files Preview List */}
              {files.length > 0 && (
                <div className="mt-2 text-xs text-gray-600 bg-gray-100 rounded p-2">
                  <p className="font-semibold mb-1">Selected Files:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {files.map((file, i) => (
                      <li key={i}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-semibold tracking-wide transition ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Submitting Request...' : 'Create Shop'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default ShopRegister;