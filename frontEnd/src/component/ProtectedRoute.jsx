import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute() {
  const { isLogin, role } = useSelector((state) => state.auth);
  const isAuthenticatedAdmin = isLogin && role?.toUpperCase() === 'ADMIN';

  return isAuthenticatedAdmin ? <Outlet /> : <Navigate to="/auth/login" replace />;
}