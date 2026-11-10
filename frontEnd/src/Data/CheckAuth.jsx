import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';

const CheckAuth = ({ isAuthenticated, user, children }) => {
  const location = useLocation();
  const path = location.pathname;

  const resolvedAuthStatus = isAuthenticated;
  const userRole = (user?.role || '').toUpperCase();

  // =========================================================
  // 1. UNAUTHENTICATED USERS GATES
  // =========================================================
  if (!resolvedAuthStatus) {
    // Prevent unauthenticated users from seeing protected routes
    if (
      path.startsWith('/admin') ||
      path.startsWith('/dealer') ||
      path === '/cart'
    ) {
      return <Navigate to="/auth/login" replace />;
    }

    // Allow public routes
    return children;
  }

  // =========================================================
  // 2. AUTHENTICATED USERS: BLOCK AUTH PAGES
  // =========================================================
  if (path.startsWith('/auth')) {
    if (userRole === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }

    if (userRole === 'DEALER') {
      return <Navigate to="/dealer" replace />;
    }

    return <Navigate to="/" replace />;
  }

  // =========================================================
  // 3. ADMIN ROUTE PROTECTION
  // =========================================================
  if (path.startsWith('/admin')) {
    if (userRole === 'ADMIN') {
      return <>{children}</>;
    }

    return <Navigate to="/" replace />;
  }

  // =========================================================
  // 4. DEALER ROUTE PROTECTION
  // =========================================================
  if (path.startsWith('/dealer')) {
    if (userRole === 'DEALER') {
      return <>{children}</>;
    }

    return <Navigate to="/" replace />;
  }

  // =========================================================
  // 5. EXTRA ROLE SAFETY CHECKS
  // =========================================================
  if (userRole !== 'ADMIN' && path.startsWith('/admin')) {
    return <Navigate to="/" replace />;
  }

  if (userRole !== 'DEALER' && path.startsWith('/dealer')) {
    return <Navigate to="/" replace />;
  }

  // =========================================================
  // 6. DEFAULT RENDER
  // =========================================================
  return <>{children}</>;
};

export default CheckAuth;