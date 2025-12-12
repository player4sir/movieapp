'use client';

/**
 * Admin Auth Context
 * Separate authentication context for admin console
 * Uses different localStorage keys to avoid conflicts with user auth
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProfile, AuthResult } from '@/types/auth';

// Use different keys for admin auth to avoid conflicts with user auth
const ADMIN_ACCESS_TOKEN_KEY = 'adminAccessToken';
const ADMIN_REFRESH_TOKEN_KEY = 'adminRefreshToken';
const ADMIN_USER_KEY = 'adminUser';

interface AdminAuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const saveAuthData = useCallback((result: AuthResult) => {
    localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, result.accessToken);
    localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, result.refreshToken);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
  }, []);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
    localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem(ADMIN_USER_KEY);
    const storedToken = localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY);

    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser);
        // Only restore if user is admin
        if (userData.role === 'admin') {
          setUser(userData);
        } else {
          clearAuthData();
        }
      } catch {
        clearAuthData();
      }
    }
    setLoading(false);
  }, [clearAuthData]);

  const getAccessToken = useCallback((): string | null => {
    return localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || '登录失败');
    }

    // Check if user is admin
    if (data.user.role !== 'admin') {
      throw new Error('该账号没有管理员权限');
    }

    saveAuthData(data);
  }, [saveAuthData]);

  const logout = useCallback(async () => {
    const token = getAccessToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {
        // Ignore logout API errors
      }
    }
    clearAuthData();
  }, [getAccessToken, clearAuthData]);

  const value: AdminAuthContextValue = {
    user,
    loading,
    isAuthenticated: !!user && user.role === 'admin',
    login,
    logout,
    getAccessToken,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
