
import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const CheckAuth = ({
  isAuthenticated,
  user,
  sessionStatus,
  children,
}) => {
  const location = useLocation();
  const path = location.pathname;

  const userRole = (user?.role || '').toUpperCase();

  // Protected customer routes
  const isCustomerProtectedRoute = [
    '/cart',
    '/checkout',
    '/my-orders',
    '/payment-success',
  ].some(
    (route) => path === route || path.startsWith(`${route}/`)
  );

  // Admin routes
  const isAdminRoute =
    path === '/admin' || path.startsWith('/admin/');

  // Dealer routes
  const isDealerRoute =
    path === '/dealer' || path.startsWith('/dealer/');

  // Authentication routes
  const isAuthRoute = path.startsWith('/auth');

  const requiresSessionCheck =
    isCustomerProtectedRoute ||
    isAdminRoute ||
    isDealerRoute ||
    isAuthRoute;

  // Wait for session restoration only on routes
  // that need an authentication decision.
  if (
    requiresSessionCheck &&
    sessionStatus === 'checking'
  ) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
        aria-label="Checking authentication"
      >
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  // Do not treat a server/network error as a logged-out session.
  if (
    (isCustomerProtectedRoute || isAdminRoute || isDealerRoute) &&
    sessionStatus === 'error' &&
    !isAuthenticated
  ) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <h2 className="text-xl font-bold text-gray-900">
          Unable to verify your session
        </h2>

        <p className="mt-2 max-w-md text-sm text-gray-500">
          We could not connect to the server to verify your login.
          Please check your internet connection and try again.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700"
        >
          Try Again
        </button>

        <Link
          to="/auth/login"
          className="mt-3 text-sm font-medium text-green-700 hover:underline"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  // Protect customer routes.
  if (isCustomerProtectedRoute && !isAuthenticated) {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // Protect admin routes.
  if (isAdminRoute && userRole !== 'ADMIN') {
    if (!isAuthenticated) {
      return (
        <Navigate
          to="/auth/login"
          replace
          state={{ from: location }}
        />
      );
    }

    return <Navigate to="/" replace />;
  }

  // Protect dealer routes.
  if (isDealerRoute && userRole !== 'DEALER') {
    if (!isAuthenticated) {
      return (
        <Navigate
          to="/auth/login"
          replace
          state={{ from: location }}
        />
      );
    }

    return <Navigate to="/" replace />;
  }

  // Redirect authenticated users away from login/register pages.
  if (isAuthRoute && isAuthenticated) {
    if (userRole === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }

    if (userRole === 'DEALER') {
      return <Navigate to="/dealer" replace />;
    }

    return <Navigate to="/" replace />;
  }

  // Render public pages and authorized pages.
  return <>{children}</>;
};

export default CheckAuth;
