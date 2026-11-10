import { Routes, Route } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast'; 
import { Loader2 } from 'lucide-react';
import axiosInstance from './lib/axios';
import { authAction } from './redux/store';

// Admin layout imports
import AdminLayout from "./pages/admin/dashboard/DashboardLayout";
import Dashboard from "./pages/admin/dashboard/AdminDashboard";
import Transactions from "./pages/admin/dashboard/Transactions";
import Products from "./pages/admin/Products";
import Orders from "./pages/admin/Orders";
import Users from "./pages/admin/Users";
import { AddNewUser } from "./pages/admin/Add-New-User";
import ShopRequests from './pages/admin/ShopRequests';
import { RegisteredShops } from './pages/admin/RegisterdShops';

// Auth shell imports
import AuthLayout from "./pages/auth/AuthLayout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResetPassword from "./pages/auth/ResetPassword";
import PageNotFound from "./component/PageNotFound";


// Home page imports 
import HomePage from './pages/Home-Page/HomePage';
import LandingPage from './pages/Home-Page/LandingPage';
import CheckAuth from './Data/CheckAuth'; // Fully synchronous guard engine
import Cart from './pages/USER/Cart';
import Phones from './pages/Home-Page/PhonesCategrory';
import Laptops from './pages/Home-Page/LaptopsCategrory';
import Fridge from './pages/Home-Page/FridgeCategrory';
import Television from './pages/Home-Page/TelevisionCategrory';
import Speakers from './pages/Home-Page/SpeakersCategrory';
import Accessories from './pages/Home-Page/AccessoriesCategrory';
import WashingMachines from './pages/Home-Page/WashingMachinesCategrory';
import Checkout from './pages/USER/Checkout';
import MyOrders from './pages/USER/MyOrders';
import PaymentSuccess from './pages/USER/PaymentSuccess';
import ProductDetail from './component/ProductDetail';
// Dealer shell imports
import ShopRegister from './pages/DELLEAR/ShopRegister';
import DellearLayout from './pages/DELLEAR/DellearLayout';
import OtpVerification from './pages/auth/OtpVerification';


const App = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isLogin);
  const user = useSelector((state) => state.auth.user);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let active = true;
    axiosInstance.get('/auth/session')
      .then(({ data }) => {
        if (active && data?.success && data.user) {
          dispatch(authAction.login({ user: data.user, role: data.user.role, accountType: data.accountType }));
        }
      })
      .catch(() => {
        // No valid server session is a normal state for logged-out visitors.
      })
      .finally(() => {
        if (active) setSessionReady(true);
      });

    return () => { active = false; };
  }, [dispatch]);

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50" role="status" aria-label="Restoring your session">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      {/* Global alert toaster layout overlay panel */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 2000,
          style: {
            width: '30vw',
            maxWidth: '28rem',
            minWidth: '20rem',
            borderRadius: '28px',
            background: '#16a34a',
            color: '#ffffff',
            boxShadow: '0 24px 80px rgba(22, 163, 74, 0.22)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            padding: '1rem 1.2rem',
            fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          },
          success: {
            style: {
              background: '#16a34a',
            },
          },
          error: {
            style: {
              background: '#dc2626',
            },
          },
        }}
      />

      <Routes>
        
        {/* =========================================================
            1. PUBLIC CUSTOMER LAYOUT & PRODUCT DISCOVERY
           ========================================================= */}
        <Route path="/" element={<HomePage />}>
          <Route index element={<LandingPage />} />
          <Route path='phones' element={<Phones />}/>
          <Route path='laptops' element={<Laptops />}/>
          <Route path='fridge' element={<Fridge />}/>
          <Route path='television' element={<Television />}/>
          <Route path='speakers' element={<Speakers />}/>
          <Route path='accessories' element={<Accessories />}/>
          <Route path='washing-machines' element={<WashingMachines />}/>
          <Route path='product-details/:id' element={<ProductDetail />} />
          
          {/* PROTECTED CUSTOMER USER BOUNDARIES (Nested under Main Header Layout) */}
          <Route path="cart" element={
            <CheckAuth isAuthenticated={isAuthenticated} user={user}>
              <Cart />
            </CheckAuth>
          } />
          <Route path="checkout" element={
            <CheckAuth isAuthenticated={isAuthenticated} user={user}>
              <Checkout />
            </CheckAuth>
          } />
          <Route path="my-orders" element={
            <CheckAuth isAuthenticated={isAuthenticated} user={user}>
              <MyOrders />
            </CheckAuth>
          } />
          <Route path="payment-success" element={
            <CheckAuth isAuthenticated={isAuthenticated} user={user}>
              <PaymentSuccess />
            </CheckAuth>
          } />
        </Route> 

        {/* Public Merchant Onboarding Route */}
        <Route path="/register-store" element={<ShopRegister />} />
        
        
        <Route path="/auth" element={ 
          <CheckAuth isAuthenticated={isAuthenticated} user={user}>
            <AuthLayout />
          </CheckAuth>
        }>
          {/* FIXED: Paths are kept relative inside child routing trees (no leading slashes) */}
          <Route path="register" element={<Register />} />       
          <Route path="login" element={<Login />} />             
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="otp-verify" element={<OtpVerification/>} />
        </Route>

        {/* 
            3. PROTECTED ADMIN WORKSPACE (Role Authenticated)
          */}
        <Route path="/admin" element={
          <CheckAuth isAuthenticated={isAuthenticated} user={user}>
            <AdminLayout />
          </CheckAuth> 
        }>
          <Route index element={<Dashboard />} />       
          <Route path="products" element={<Products />} />     
          <Route path="orders" element={<Orders />} />         
          <Route path="transactions" element={<Transactions />} />
          <Route path="users" element={<Users />} />           
          <Route path="add-user" element={<AddNewUser />} />
          <Route path="shop-request" element={<ShopRequests />} />
          <Route path="registered-shops" element={<RegisteredShops />} />
        </Route>

        {/* =========================================================
            4. PROTECTED MERCHANT DEALER WORKSPACE (Role Authenticated)
           ========================================================= */}
        <Route path="/dealer" element={
           <CheckAuth isAuthenticated={isAuthenticated} user={user}>
            <DellearLayout />
           </CheckAuth>
        }>
          <Route index element={<div>Dealer Dashboard Overview</div>} />
        </Route>

        {/* Catch-all Routing Exception Handlers */}
        <Route path="*" element={<PageNotFound />} />
      
      </Routes>
    </>
  );
};

export default App;
