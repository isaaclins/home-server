import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken, setAuthToken as setTokenInStorage, removeAuthToken, getUserFromToken } from '@/lib/auth';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state to handle initial auth check
  const router = useRouter();

  // Check for token on initial load
  useEffect(() => {
    const currentUser = getUserFromToken();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = useCallback((token) => {
    setTokenInStorage(token);
    const newUser = getUserFromToken(); // Decode the new token
    setUser(newUser);
    toast.success('Login successful! Redirecting...');
    router.push('/services'); // Redirect after login to /services
  }, [router]);

  const logout = useCallback(() => {
    removeAuthToken();
    setUser(null);
    toast.info('You have been logged out.');
    router.push('/login'); // Redirect to login after logout
  }, [router]);

  const value = {
    user,
    isAdmin: user?.isAdmin || false,
    loading,
    login,
    logout,
    isAuthenticated: !!user // Helper boolean 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
} 
