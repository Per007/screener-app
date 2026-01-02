import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiService } from '../api/apiService';
import { 
  setAuthToken, 
  clearAuthToken, 
  setUserData, 
  getUserData,
  isAuthenticated as checkIsAuthenticated 
} from '../utils/authUtils';

interface AuthContextType {
  user: any | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if user is already authenticated on initial load
    const checkAuth = () => {
      if (checkIsAuthenticated()) {
        const userData = getUserData();
        setUser(userData);
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);
  
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.login(email, password);
      
      if (response.token) {
        setAuthToken(response.token);
        setUserData(response.user);
        setUser(response.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await apiService.logout();
      clearAuthToken();
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
      // Clear auth anyway even if logout API call fails
      clearAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  
  const isAdmin = user?.role === 'admin';
  
  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: checkIsAuthenticated(), 
        isAdmin, 
        login, 
        logout, 
        loading, 
        error 
      }} 
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
