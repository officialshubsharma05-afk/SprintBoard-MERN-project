import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, getProfile, logout as apiLogout } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('sprintboard_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('sprintboard_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Validate session on initial load or token changes
  useEffect(() => {
    const verifySession = async () => {
      const savedToken = localStorage.getItem('sprintboard_token');
      if (savedToken) {
        try {
          const res = await getProfile();
          if (res?.user || res?.data) {
            const userData = res.user || res.data;
            setUser(userData);
            localStorage.setItem('sprintboard_user', JSON.stringify(userData));
          }
        } catch (err) {
          console.warn('[AuthContext] Stored session is invalid or expired:', err.message);
          logout();
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    };

    verifySession();
  }, []);

  const login = async (credentials) => {
    setAuthError(null);
    try {
      const res = await apiLogin(credentials);
      const authToken = res.token || res.data?.token;
      const userData = res.user || res.data;

      if (authToken) {
        localStorage.setItem('sprintboard_token', authToken);
        if (userData) {
          localStorage.setItem('sprintboard_user', JSON.stringify(userData));
        }
        setToken(authToken);
        setUser(userData);
      }
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setAuthError(msg);
      throw err;
    }
  };

  const register = async (userData) => {
    setAuthError(null);
    try {
      const res = await apiRegister(userData);
      const authToken = res.token || res.data?.token;
      const userObj = res.user || res.data;

      if (authToken) {
        localStorage.setItem('sprintboard_token', authToken);
        if (userObj) {
          localStorage.setItem('sprintboard_user', JSON.stringify(userObj));
        }
        setToken(authToken);
        setUser(userObj);
      }
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please check your input.';
      setAuthError(msg);
      throw err;
    }
  };

  const logout = () => {
    apiLogout();
    setToken(null);
    setUser(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        authError,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
