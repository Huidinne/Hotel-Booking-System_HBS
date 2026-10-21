import React, { createContext, useContext, useState } from 'react';
import { mockAuthService } from '../services/mockAuthService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize to saved user if logged in, or null (Guest visitor) by default
  const [currentUser, setCurrentUser] = useState(() => {
    return mockAuthService.getCurrentUser();
  });

  const [loading, setLoading] = useState(false);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await mockAuthService.login(credentials);
      setCurrentUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data) => {
    setLoading(true);
    try {
      const res = await mockAuthService.register(data);
      setCurrentUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await mockAuthService.logout();
    setCurrentUser(null);
  };

  const switchAccount = (user) => {
    mockAuthService.switchUser(user);
    setCurrentUser(user);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        register,
        logout,
        switchAccount,
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
