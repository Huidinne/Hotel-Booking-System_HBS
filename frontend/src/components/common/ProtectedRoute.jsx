import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * ProtectedRoute - Guard routes based on user authentication and roles.
 * Redirects unauthorized users to their designated role portal or login page.
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner text="Đang kiểm tra quyền truy cập..." />;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = currentUser.role;
    const hasRole = allowedRoles.some((role) => {
      if (role === 'ADMIN') return userRole === 'ROLE_ADMIN' || userRole === 'ADMIN';
      if (role === 'RECEPTIONIST') {
        return (
          userRole === 'ROLE_RECEPTIONIST' ||
          userRole === 'RECEPTIONIST' ||
          userRole === 'ROLE_ADMIN' ||
          userRole === 'ADMIN'
        );
      }
      if (role === 'CUSTOMER') return userRole === 'ROLE_CUSTOMER' || userRole === 'CUSTOMER';
      return userRole === role;
    });

    if (!hasRole) {
      if (userRole === 'ROLE_RECEPTIONIST' || userRole === 'RECEPTIONIST') {
        return <Navigate to="/receptionist/timeline" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
