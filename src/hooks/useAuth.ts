'use client';

import { useAuthContext } from '@/contexts/AuthContext';

// Re-export the hook from context for backward compatibility
export function useAuth() {
  return useAuthContext();
}

// Also export the provider for use in layout
export { AuthProvider } from '@/contexts/AuthContext';
