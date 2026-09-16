import React from 'react';
import { Outlet } from 'react-router';
// import { Navigate, useLocation } from 'react-router';
// import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // const { isAuthenticated, isLoading, passwordChangeRequired } = useAuth();
  // const location = useLocation();

  /*
  // JWT Authentication Guard - Temporarily commented out to bypass login page until backend JWT is implemented
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#071a2e] text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-teal-500 border-t-transparent"></div>
          <span className="text-xs font-semibold tracking-wider text-slate-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force users with expired/default password to change password first
  if (passwordChangeRequired && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  */

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
