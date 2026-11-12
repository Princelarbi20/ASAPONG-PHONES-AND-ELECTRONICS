import { Routes, Route } from 'react-router-dom';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast'; 
import { Loader2 } from 'lucide-react';
import axiosInstance from './lib/axios';
import { authAction } from './redux/store';

// Keep the session/auth guard small and load each route's page only when visited.
import CheckAuth from './Data/CheckAuth';
const AdminLayout = lazy(() => import('./pages/admin/dashboard/DashboardLayout'));
const Dashboard = lazy(() => import('./pages/admin/dashboard/AdminDashboard'));
const Transactions = lazy(() => import('./pages/admin/dashboard/Transactions'));
const Products = lazy(() => import('./pages/admin/Products'));
const Orders = lazy(() => import('./pages/admin/Orders'));
const Users = lazy(() => import('./pages/admin/Users'));
const AddNewUser = lazy(() => import('./pages/admin/Add-New-User').then((module) => ({ default: module.AddNewUser })));
const ShopRequests = lazy(() => import('./pages/admin/ShopRequests'));
const RegisteredShops = lazy(() => import('./pages/admin/RegisterdShops').then((module) => ({ default: module.RegisteredShops })));
const AuthLayout = lazy(() => import('./pages/auth/AuthLayout'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const VerifyResetOTP = lazy(() => import('./pages/auth/VerifyResetOTP'));
const CreateNewPassword = lazy(() => import('./pages/auth/CreateNewPassword'));
const PageNotFound = lazy(() => import('./component/PageNotFound'));
const HomePage = lazy(() => import('./pages/Home-Page/HomePage'));
const LandingPage = lazy(() => import('./pages/Home-Page/LandingPage'));
const Cart = lazy(() => import('./pages/USER/Cart'));
const Phones = lazy(() => import('./pages/Home-Page/PhonesCategrory'));
const Laptops = lazy(() => import('./pages/Home-Page/LaptopsCategrory'));
const Fridge = lazy(() => import('./pages/Home-Page/FridgeCategrory'));
const Television = lazy(() => import('./pages/Home-Page/TelevisionCategrory'));
const Speakers = lazy(() => import('./pages/Home-Page/SpeakersCategrory'));
const Accessories = lazy(() => import('./pages/Home-Page/AccessoriesCategrory'));
const WashingMachines = lazy(() => import('./pages/Home-Page/WashingMachinesCategrory'));
const Checkout = lazy(() => import('./pages/USER/Checkout'));
const MyOrders = lazy(() => import('./pages/USER/MyOrders'));
const PaymentSuccess = lazy(() => import('./pages/USER/PaymentSuccess'));
const ProductDetail = lazy(() => import('./component/ProductDetail'));
const ShopRegister = lazy(() => import('./pages/DELLEAR/ShopRegister'));
const DellearLayout = lazy(() => import('./pages/DELLEAR/DellearLayout'));
const OtpVerification = lazy(() => import('./pages/auth/OtpVerification'));

const RouteLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50" role="status" aria-label="Loading page">
    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
  </div>
);


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

      <Suspense fallback={<RouteLoading />}>
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
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="verify-reset-otp" element={<VerifyResetOTP />} />
          <Route path="reset-password" element={<CreateNewPassword />} />
          <Route path="change-password" element={<ResetPassword />} />
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
      </Suspense>
    </>
  );
};

export default App;
