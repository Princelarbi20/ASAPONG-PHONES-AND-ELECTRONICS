import React, { useState, useEffect } from 'react';
import axiosInstance, { resolveApiAssetUrl } from '../../lib/axios';
import { X, Store, Mail, Phone, FileText, ShieldCheck, AlertCircle } from 'lucide-react';

const ShopRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Side Drawer Panel Management States
    const [selectedShop, setSelectedShop] = useState(null); 
    const [adminNotes, setAdminNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isDrawerRendered, setIsDrawerRendered] = useState(false);

    const getAuthConfig = () => ({
        withCredentials: true,
        headers: {}
    });

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get('/get-shop-request', getAuthConfig());
                
                const shopArray = response.data.data || [];
                const pendingShops = shopArray.filter(shop => shop.status === 'PENDING');
                
                setRequests(pendingShops);
                setError(null);
            } catch (err) {
                console.error("Axios Fetch Error:", err);
                setError(err.response?.data?.message || "Access denied. Please verify your administrative login session.");
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, []);

    const handleUpdateStatus = async (statusValue) => {
        if (!selectedShop) return;

        try {
            setSubmitting(true);
            
            const payload = {
                shopName: selectedShop.shopName,
                status: statusValue,
                adminNotes: adminNotes.trim() ? [adminNotes.trim()] : []
            };

            const response = await axiosInstance.put('/update-shop-status', payload, getAuthConfig());

            if (response.data.success) {
                setRequests(prev => prev.filter(req => req._id !== selectedShop._id));
                handleCloseDrawer();
            }
        } catch (err) {
            console.error("Status update error:", err);
            alert(`Transaction rejected: ${err.response?.data?.message || err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenDrawer = (shop) => {
        setSelectedShop(shop);
        setAdminNotes(''); 
        setTimeout(() => setIsDrawerRendered(true), 10);
    };

    const handleCloseDrawer = () => {
        setIsDrawerRendered(false);
        setTimeout(() => {
            setSelectedShop(null);
            setAdminNotes('');
        }, 250);
    };

    const getCertificateUrl = (urlPath) => {
        if (!urlPath) return '#';
        if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
            return urlPath;
        }
        let cleanPath = urlPath.replace(/\\/g, '/'); 
        if (cleanPath.startsWith('uploads/')) {
            cleanPath = '/' + cleanPath;
        } else if (!cleanPath.startsWith('/uploads/')) {
            cleanPath = '/uploads/certificates/' + cleanPath;
        }
        return resolveApiAssetUrl(cleanPath);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] w-full py-20 select-none">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-sm font-medium text-slate-500 tracking-wide">Syncing data streams...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto my-8 p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4 shadow-sm select-none">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-rose-900">API Connection Pipeline Interrupted</h3>
                    <p className="mt-1 text-sm text-rose-700 font-medium leading-relaxed">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 antialiased relative select-none">
            
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Merchant Boarding Queue</h1>
                    <p className="mt-1 text-sm text-slate-500">Audit, verify, and handle onboarding lifecycle states for inbound applications.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full shadow-sm">
                        <span className="w-1.5 h-1.5 mr-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                        {requests.length} Submissions Pending
                    </span>
                </div>
            </div>

            {/* Core Table Grid Display List */}
            {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white border border-dashed border-slate-200 rounded-2xl text-center shadow-sm">
                    <div className="p-3 bg-slate-50 text-slate-400 rounded-xl mb-3">
                        <Store className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">Queue completely clear</h3>
                    <p className="mt-1 text-xs text-slate-400 max-w-xs">All pending registration requests have been resolved.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-[11px] font-bold tracking-wider uppercase">
                                    <th className="px-6 py-4">Shop Name</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Business Email</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                {requests.map((request) => (
                                    <tr 
                                        key={request._id || request.id} 
                                        className="hover:bg-slate-50/70 cursor-pointer transition duration-150 group"
                                        onClick={() => handleOpenDrawer(request)}
                                    >
                                        <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            {request.shopName}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                                {request.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {request.email}
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                type="button"
                                                onClick={() => handleOpenDrawer(request)}
                                                className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-900 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer"
                                            >
                                                Review Details &rarr;
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* =========================================================
                SLIDING DRAWER COMPONENT: 30% Width, Slate-Gray Panel, Hidden Scrollbar
                ========================================================= */}
            {selectedShop && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    
                    {/* Backdrop Overlay Mask */}
                    <div 
                        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
                            isDrawerRendered ? 'opacity-100' : 'opacity-0'
                        }`}
                        onClick={handleCloseDrawer}
                    />

                    {/* Sliding Drawer Container */}
                    <div 
                        className={`relative lg:w-[30%] md:w-[45%] w-[85vw] bg-slate-900 border-l border-slate-800 text-white h-screen shadow-2xl flex flex-col p-6 z-10 transform transition-transform duration-300 ease-out ${
                            isDrawerRendered ? 'translate-x-0' : 'translate-x-full'
                        }`}
                    >
                        {/* Close Toggle Action Button */}
                        <button 
                            type="button"
                            onClick={handleCloseDrawer} 
                            className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
                            aria-label="Close review panel"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Top Drawer Title Header */}
                        <div className="mb-6 shrink-0 pb-4 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                <Store className="w-5 h-5 text-indigo-400" /> Review Application
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">Verify information blocks across properties</p>
                        </div>

                        {/* Main Body Scrolling Parameters Space Container */}
                        <div 
                            className="flex-1 overflow-y-auto space-y-5 pr-1 pb-4 scrollbar-none"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <style dangerouslySetInnerHTML={{__html: `div::-webkit-scrollbar { display: none !important; }`}} />

                            {/* Section Block 1: Base Profiles */}
                            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-3">
                                <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" /> Base Profile Info
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Commercial Entity Name</label>
                                    <p className="text-sm font-bold text-white mt-0.5">{selectedShop.shopName}</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Trading Classification</label>
                                    <p className="text-xs font-semibold text-slate-300 mt-0.5">{selectedShop.category}</p>
                                </div>
                            </div>

                            {/* Section Block 2: Contacts */}
                            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-3">
                                <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Contact Nodes
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                                    <div className="overflow-hidden">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase leading-none">Business Email</label>
                                        <p className="text-xs font-medium text-slate-200 truncate mt-0.5">{selectedShop.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase leading-none">Contact Number</label>
                                        <p className="text-xs font-bold text-slate-200 mt-0.5">{selectedShop.number || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Section Block 3: Description Bio */}
                            <div>
                                <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1">Storefront Description Background</label>
                                <div className="p-3 bg-slate-800/50 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto">
                                    {selectedShop.description}
                                </div>
                            </div>

                            {/* Section Block 4: Certificates */}
                            <div>
                                <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Legal Verification Materials</label>
                                {selectedShop.shopCertificates && selectedShop.shopCertificates.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {selectedShop.shopCertificates.map((cert, index) => (
                                            <a
                                                key={index}
                                                href={getCertificateUrl(cert.url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-indigo-400 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition-all"
                                            >
                                                <FileText className="w-4 h-4 text-slate-500" />
                                                <span>View Document {index + 1}</span>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs italic text-slate-500">No identity document files declared on record.</p>
                                )}
                            </div>

                            {/* Section Block 5: Action Notes Input */}
                            <div className="space-y-1.5 pt-1">
                                <label htmlFor="adminNotes" className="block text-xs font-bold tracking-wider text-slate-400 uppercase">
                                    Administrative Feedback Notes
                                </label>
                                <textarea
                                    id="adminNotes"
                                    rows="3"
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add reasons behind the application state changes..."
                                    className="w-full text-xs px-3 py-2 border border-slate-700 bg-slate-800/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder-slate-500 shadow-sm resize-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Persistent Non-Scrolling Action Buttons Footer Panel */}
                        <div className="pt-4 border-t border-slate-800 shrink-0 bg-slate-900 mt-auto flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleUpdateStatus('REJECTED')}
                                    className="w-full px-4 py-2.5 text-xs font-bold text-rose-400 bg-slate-800 hover:bg-rose-950/20 active:bg-rose-950/40 border border-slate-700 rounded-xl transition cursor-pointer"
                                >
                                    Reject Request
                                </button>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleUpdateStatus('APPROVED')}
                                    className="w-full px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/10 cursor-pointer"
                                >
                                    {submitting ? 'Updating...' : 'Approve'}
                                </button>
                            </div>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={handleCloseDrawer}
                                className="w-full px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                            >
                                Dismiss Review
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default ShopRequests;
