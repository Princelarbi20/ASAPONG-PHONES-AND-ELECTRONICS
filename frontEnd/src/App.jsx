
import { Routes, Route } from 'react-router-dom';
import React, { lazy, Suspense, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

import axiosInstance from './lib/axios';
import { authAction } from './redux/store';
import CheckAuth from './Data/CheckAuth';

// Admin pages
const AdminLayout = lazy(() => import('./pages/admin/dashboard/DashboardLayout'));
const Dashboard = lazy(() => import('./pages/admin/dashboard/AdminDashboard'));
const Transactions = lazy(() => import('./pages/admin/dashboard/Transactions'));
const Products = lazy(() => import('./pages/admin/Products'));
const Orders = lazy(() => import('./pages/admin/Orders'));
const Users = lazy(() => import('./pages/admin/Users'));

const AddNewUser = lazy(() =>
  import('./pages/admin/Add-New-User').then((module) => ({
    default: module.AddNewUser,
  }))
);

const ShopRequests = lazy(() => import('./pages/admin/ShopRequests'));

const RegisteredShops = lazy(() =>
  import('./pages/admin/RegisterdShops').then((module) => ({
    default: module.RegisteredShops,
  }))
);

// Authentication pages
const AuthLayout = lazy(() => import('./pages/auth/AuthLayout'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const VerifyResetOTP = lazy(() => import('./pages/auth/VerifyResetOTP'));
const CreateNewPassword = lazy(() => import('./pages/auth/CreateNewPassword'));
const OtpVerification = lazy(() => import('./pages/auth/OtpVerification'));

// Public pages
const PageNotFound = lazy(() => import('./component/PageNotFound'));
const HomePage = lazy(() => import('./pages/Home-Page/HomePage'));
const LandingPage = lazy(() => import('./pages/Home-Page/LandingPage'));

const Phones = lazy(() => import('./pages/Home-Page/PhonesCategrory'));
const Laptops = lazy(() => import('./pages/Home-Page/LaptopsCategrory'));
const Fridge = lazy(() => import('./pages/Home-Page/FridgeCategrory'));
const Television = lazy(() => import('./pages/Home-Page/TelevisionCategrory'));
const Speakers = lazy(() => import('./pages/Home-Page/SpeakersCategrory'));
const Accessories = lazy(() => import('./pages/Home-Page/AccessoriesCategrory'));
const Appliances = lazy(() => import('./pages/Home-Page/AppliancesCategrory'));
const AirConditions = lazy(() => import('./pages/Home-Page/AirConditionsCategrory'));
const WashingMachines = lazy(() => import('./pages/Home-Page/WashingMachinesCategrory'));

const ProductDetail = lazy(() => import('./component/ProductDetail'));

// Customer pages
const Cart = lazy(() => import('./pages/USER/Cart'));
const Checkout = lazy(() => import('./pages/USER/Checkout'));
const MyOrders = lazy(() => import('./pages/USER/MyOrders'));
const PaymentSuccess = lazy(() => import('./pages/USER/PaymentSuccess'));

// Dealer pages
const ShopRegister = lazy(() => import('./pages/DELLEAR/ShopRegister'));
const DellearLayout = lazy(() => import('./pages/DELLEAR/DellearLayout'));

// Lazy loading fallback
const RouteLoading = () => (
  <div
    className="flex min-h-screen items-center justify-center bg-slate-50"
    role="status"
    aria-label="Loading page"
  >
    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
  </div>
);

const App = () => {
  const dispatch = useDispatch();

  const isAuthenticated = useSelector(
    (state) => state.auth.isLogin
  );

  const user = useSelector(
    (state) => state.auth.user
  );

  const sessionStatus = useSelector(
    (state) => state.auth.sessionStatus
  );

  // Restore the existing login session in the background.
  useEffect(() => {
    let active = true;

    dispatch(authAction.sessionCheckStarted());

    const restoreSession = async () => {
      try {
        const { data } = await axiosInstance.get('/auth/session');

        if (!active) return;

        if (data?.success && data?.user) {
          dispatch(
            authAction.sessionCheckSucceeded({
              user: {
                ...data.user,
                role: data.user.role || data.accountType || null,
              },
            })
          );
        } else {
          dispatch(authAction.sessionCheckFailed());
        }
      } catch (error) {
        if (!active) return;

        const status = error.response?.status;

        // No valid login session is a normal situation.
        if (status === 401 || status === 403) {
          dispatch(authAction.sessionCheckFailed());
        } else {
          // Network or server errors should not be treated
          // as proof that the visitor is logged out.
          dispatch(authAction.sessionCheckError());
          console.error('Session restoration failed:', error);
        }
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, [dispatch]);

  return (
    <>
      {/* Global notification toaster */}
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
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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

          {/* =========================================
              1. PUBLIC CUSTOMER PAGES
          ========================================= */}

          <Route path="/" element={<HomePage />}>
            <Route index element={<LandingPage />} />

            <Route path="phones" element={<Phones />} />
            <Route path="laptops" element={<Laptops />} />
            <Route path="fridge" element={<Fridge />} />
            <Route path="television" element={<Television />} />
            <Route path="speakers" element={<Speakers />} />
            <Route path="accessories" element={<Accessories />} />
            <Route path="appliances" element={<Appliances />} />
            <Route path="air-conditions" element={<AirConditions />} />
            <Route path="washing-machines" element={<WashingMachines />} />

            <Route
              path="product-details/:id"
              element={<ProductDetail />}
            />

            {/* =========================================
                2. PROTECTED CUSTOMER PAGES
            ========================================= */}

            <Route
              path="cart"
              element={
                <CheckAuth
                  isAuthenticated={isAuthenticated}
                  user={user}
                  sessionStatus={sessionStatus}
                >
                  <Cart />
                </CheckAuth>
              }
            />

            <Route
              path="checkout"
              element={
                <CheckAuth
                  isAuthenticated={isAuthenticated}
                  user={user}
                  sessionStatus={sessionStatus}
                >
                  <Checkout />
                </CheckAuth>
              }
            />

            <Route
              path="my-orders"
              element={
                <CheckAuth
                  isAuthenticated={isAuthenticated}
                  user={user}
                  sessionStatus={sessionStatus}
                >
                  <MyOrders />
                </CheckAuth>
              }
            />

            <Route
              path="payment-success"
              element={
                <CheckAuth
                  isAuthenticated={isAuthenticated}
                  user={user}
                  sessionStatus={sessionStatus}
                >
                  <PaymentSuccess />
                </CheckAuth>
              }
            />
          </Route>

          {/* =========================================
              3. PUBLIC SHOP REGISTRATION
          ========================================= */}

          <Route
            path="/register-store"
            element={<ShopRegister />}
          />

          {/* =========================================
              4. AUTHENTICATION PAGES
          ========================================= */}

          <Route
            path="/auth"
            element={
              <CheckAuth
                isAuthenticated={isAuthenticated}
                user={user}
                sessionStatus={sessionStatus}
              >
                <AuthLayout />
              </CheckAuth>
            }
          >
            <Route path="register" element={<Register />} />
            <Route path="login" element={<Login />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="verify-reset-otp" element={<VerifyResetOTP />} />
            <Route path="reset-password" element={<CreateNewPassword />} />
            <Route path="change-password" element={<ResetPassword />} />
            <Route path="otp-verify" element={<OtpVerification />} />
          </Route>

          {/* =========================================
              5. PROTECTED ADMIN WORKSPACE
          ========================================= */}

          <Route
            path="/admin"
            element={
              <CheckAuth
                isAuthenticated={isAuthenticated}
                user={user}
                sessionStatus={sessionStatus}
              >
                <AdminLayout />
              </CheckAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<Orders />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="users" element={<Users />} />
            <Route path="add-user" element={<AddNewUser />} />
            <Route path="shop-request" element={<ShopRequests />} />
            <Route path="registered-shops" element={<RegisteredShops />} />
          </Route>

          {/* =========================================
              6. PROTECTED DEALER WORKSPACE
          ========================================= */}

          <Route
            path="/dealer"
            element={
              <CheckAuth
                isAuthenticated={isAuthenticated}
                user={user}
                sessionStatus={sessionStatus}
              >
                <DellearLayout />
              </CheckAuth>
            }
          >
            <Route
              index
              element={<div>Dealer Dashboard Overview</div>}
            />
          </Route>

          {/* =========================================
              7. CATCH-ALL ROUTE
          ========================================= */}

          <Route
            path="*"
            element={<PageNotFound />}
          />

        </Routes>
      </Suspense>
    </>
  );
};

export default App;
