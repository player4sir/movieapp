'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AdminLayoutContextType {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const AdminLayoutContext = createContext<AdminLayoutContextType | null>(null);

export function useAdminLayout() {
  const context = useContext(AdminLayoutContext);
  if (!context) {
    throw new Error('useAdminLayout must be used within AdminLayoutProvider');
  }
  return context;
}

export function AdminLayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <AdminLayoutContext.Provider value={{ sidebarOpen, openSidebar, closeSidebar }}>
      {children}
    </AdminLayoutContext.Provider>
  );
}
