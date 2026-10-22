import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize to saved user if logged in, or null (Guest visitor) by default
  const [currentUser, setCurrentUser] = useState(() => {
    return authService.getCurrentUser();
  });

  const [loading, setLoading] = useState(false);

  // Sync profile on mount if token is present
  useEffect(() => {
    const token = localStorage.getItem('hbs_access_token');
    if (token && !currentUser) {
      authService.getProfile().then((user) => {
        if (user) setCurrentUser(user);
      }).catch(() => {});
    }
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await authService.login(credentials);
      setCurrentUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data) => {
    setLoading(true);
    try {
      const res = await authService.register(data);
      setCurrentUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        register,
        logout,
        isCustomer: currentUser?.role === 'ROLE_CUSTOMER',
        isReceptionist: currentUser?.role === 'ROLE_RECEPTIONIST' || currentUser?.role === 'ROLE_ADMIN',
        isAdmin: currentUser?.role === 'ROLE_ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
