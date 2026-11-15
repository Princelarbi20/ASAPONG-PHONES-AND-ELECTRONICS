import React from 'react';
import { Outlet } from 'react-router-dom';
import ShopName from '@/component/ShopName';
export const AuthLayout = () => {
  return (
    <div className="h-screen max-h-screen w-full flex bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white overflow-hidden fixed inset-0">
      
      {/* LEFT SIDE: Brand Hero Showcase (Hidden on mobile screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 relative items-center justify-center p-12 overflow-hidden select-none h-full">
        
        {/* Modern ambient layout blur blobs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-2xl"></div>

        <div className="relative z-10 text-center max-w-lg space-y-6">
          {/* Floating tech icons track bar */}
          
          <ShopName className="lg:h-20"/>
          <p className="text-slate-300/90 text-lg font-medium leading-relaxed max-w-md mx-auto">
            Your premium gateway to cutting-edge mobile technologies, smart gadgets, and high-performance computing components.
          </p>

          <div className="pt-8 border-t border-white/10 max-w-xs mx-auto text-xs text-slate-400 font-bold tracking-wider uppercase">
            ⚡ Quick • Secure • Verified Platform
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Interactive Client Form Panel Wrapper */}
      <main className="w-full lg:w-1/2  flex flex-col justify-center items-center px-4 sm:px-8 py-4 relative bg-blue-200 h-full overflow-hidden">
        {/* Outer dynamic nested child container space - 100% locked size */}
        <div className="w-full max-w-md flex flex-col justify-center items-center h-full max-h-full overflow-hidden">
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default AuthLayout;
