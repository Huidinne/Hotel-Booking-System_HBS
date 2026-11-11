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
    if (token) {
      authService.getProfile().then((user) => {
        if (user) {
          setCurrentUser(user);
        } else {
          setCurrentUser(null);
        }
      }).catch(() => {
        setCurrentUser(null);
      });
    } else {
      setCurrentUser(null);
    }

    const handleAuthExpired = () => {
      setCurrentUser(null);
    };

    window.addEventListener('hbs_auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('hbs_auth_expired', handleAuthExpired);
    };
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
        isCustomer: currentUser?.role === 'ROLE_CUSTOMER' || currentUser?.role === 'CUSTOMER',
        isReceptionist:
          currentUser?.role === 'ROLE_RECEPTIONIST' ||
          currentUser?.role === 'RECEPTIONIST' ||
          currentUser?.role === 'ROLE_ADMIN' ||
          currentUser?.role === 'ADMIN',
        isAdmin: currentUser?.role === 'ROLE_ADMIN' || currentUser?.role === 'ADMIN',
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
