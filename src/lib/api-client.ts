/**
 * API Client with automatic token refresh
 * Handles 401 errors by attempting to refresh the token and retry the request
 * 
 * This module provides:
 * 1. `api` object for making authenticated requests with auto token refresh
 * 2. `setupGlobalFetchInterceptor()` to intercept ALL fetch calls globally
 */

// User auth keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

// Admin auth keys (separate from user auth)
const ADMIN_ACCESS_TOKEN_KEY = 'adminAccessToken';
const ADMIN_REFRESH_TOKEN_KEY = 'adminRefreshToken';
const ADMIN_USER_KEY = 'adminUser';

interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  user: unknown;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Check if current page is in admin area
 */
function isAdminArea(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/console-x9k2m');
}

/**
 * Get access token from localStorage (auto-detect admin vs user)
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return isAdminArea()
    ? localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY)
    : localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token from localStorage (auto-detect admin vs user)
 */
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return isAdminArea()
    ? localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY)
    : localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Save auth data to localStorage (auto-detect admin vs user)
 */
function saveAuthData(data: RefreshResponse): void {
  if (isAdminArea()) {
    localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.user));
  } else {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
}

/**
 * Clear auth data from localStorage (auto-detect admin vs user)
 */
function clearAuthData(): void {
  if (isAdminArea()) {
    localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
    localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * Attempt to refresh the access token
 */
async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const storedRefreshToken = getRefreshToken();
  if (!storedRefreshToken) {
    clearAuthData();
    return false;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (!response.ok) {
        clearAuthData();
        return false;
      }

      const data: RefreshResponse = await response.json();
      saveAuthData(data);
      return true;
    } catch {
      clearAuthData();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Make an authenticated API request with automatic token refresh
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: ApiClientOptions = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const { skipAuth = false, ...fetchOptions } = options;

  // Build headers
  const headers = new Headers(fetchOptions.headers);

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Make the request
  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '网络请求失败',
      status: 0,
    };
  }

  // If 401 and not skipping auth, try to refresh token and retry
  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      // Retry with new token
      const newToken = getAccessToken();
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
      }

      try {
        response = await fetch(url, {
          ...fetchOptions,
          headers,
        });
      } catch (error) {
        return {
          data: null,
          error: error instanceof Error ? error.message : '网络请求失败',
          status: 0,
        };
      }
    } else {
      // Refresh failed, redirect to login
      if (typeof window !== 'undefined') {
        // Determine if we're in admin console or user area
        const isAdminArea = window.location.pathname.startsWith('/console-x9k2m');
        const loginPath = isAdminArea ? '/console-x9k2m/login' : '/auth/login';

        // Redirect to appropriate login page
        window.location.href = loginPath;
      }
      return {
        data: null,
        error: '登录已过期，正在跳转到登录页面...',
        status: 401,
      };
    }
  }

  // Parse response
  try {
    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: data.message || `请求失败 (${response.status})`,
        status: response.status,
      };
    }

    return {
      data: data as T,
      error: null,
      status: response.status,
    };
  } catch {
    if (!response.ok) {
      return {
        data: null,
        error: `请求失败 (${response.status})`,
        status: response.status,
      };
    }
    return {
      data: null,
      error: null,
      status: response.status,
    };
  }
}

/**
 * Convenience methods
 */
export const api = {
  get: <T = unknown>(url: string, options?: ApiClientOptions) =>
    apiRequest<T>(url, { ...options, method: 'GET' }),

  post: <T = unknown>(url: string, body?: unknown, options?: ApiClientOptions) =>
    apiRequest<T>(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(url: string, body?: unknown, options?: ApiClientOptions) =>
    apiRequest<T>(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(url: string, options?: ApiClientOptions) =>
    apiRequest<T>(url, { ...options, method: 'DELETE' }),
};

// ============================================
// Global Fetch Interceptor
// ============================================

let originalFetch: typeof fetch | null = null;
let interceptorInstalled = false;

/**
 * Handle 401 response globally
 * Attempts to refresh token and retry, or redirects to login
 */
async function handle401Response(
  url: RequestInfo | URL,
  init: RequestInit | undefined,
  response: Response
): Promise<Response> {
  // Don't intercept auth endpoints to avoid infinite loops
  const urlString = typeof url === 'string' ? url : url.toString();
  if (urlString.includes('/api/auth/')) {
    return response;
  }

  // If no refresh token exists, user was never logged in - don't redirect
  const storedRefreshToken = getRefreshToken();
  if (!storedRefreshToken) {
    // User is not logged in, just return the 401 response
    // Let the calling code handle it (e.g., show login prompt)
    return response;
  }

  // Try to refresh token
  const refreshed = await refreshAccessToken();

  if (refreshed) {
    // Retry the original request with new token
    const newToken = getAccessToken();
    const newInit: RequestInit = { ...init };
    const headers = new Headers(newInit.headers);

    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
    }
    newInit.headers = headers;

    // Use original fetch to avoid recursion
    if (originalFetch) {
      return originalFetch(url, newInit);
    }
  }

  // Refresh failed - clear auth and redirect to login
  clearAuthData();

  if (typeof window !== 'undefined') {
    const adminArea = window.location.pathname.startsWith('/console-x9k2m');
    const loginPath = adminArea ? '/console-x9k2m/login' : '/auth/login';

    // Use setTimeout to allow current code to complete
    setTimeout(() => {
      // Avoid infinite redirect loop if already on login page
      if (window.location.pathname === loginPath) {
        return;
      }
      window.location.href = loginPath;
    }, 0);
  }

  return response;
}

/**
 * Setup global fetch interceptor
 * Call this once in your app's root layout or _app.tsx
 * 
 * This will intercept ALL fetch calls and handle 401 errors automatically
 */
export function setupGlobalFetchInterceptor(): void {
  if (typeof window === 'undefined') return;
  if (interceptorInstalled) return;

  originalFetch = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    if (!originalFetch) {
      throw new Error('Original fetch not available');
    }

    // Make the request
    const response = await originalFetch(input, init);

    // Handle 401 responses
    if (response.status === 401) {
      // Clone response since body can only be read once
      const clonedResponse = response.clone();
      return handle401Response(input, init, clonedResponse);
    }

    return response;
  };

  interceptorInstalled = true;
  console.log('[API Client] Global fetch interceptor installed');
}

/**
 * Remove global fetch interceptor (for testing)
 */
export function removeGlobalFetchInterceptor(): void {
  if (typeof window === 'undefined') return;
  if (!interceptorInstalled || !originalFetch) return;

  window.fetch = originalFetch;
  originalFetch = null;
  interceptorInstalled = false;
}
