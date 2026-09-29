import { API_CONFIG } from '../config';
import { getAccessToken } from './apiClient';
import { useOnlineStore } from '@/stores/onlineStore';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};


/**
 * Emergency API Client
 * Handles authentication for ambulance personnel with separate token refresh logic
 */
export async function emergencyApiClient<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const isClient = typeof window !== 'undefined';
  const isAmbulanceContext = isClient && localStorage.getItem('userRole') === 'ambulance';
  
  // Priority: 
  // 1. shared in-memory token 
  // 2. localStorage token (if in ambulance context)
  // 3. cookie token (only as last resort, and not if we're in an ambulance context to avoid helpdesk leakage)
  let token = getAccessToken();
  
  if (!token && isClient) {
    const sessionToken = localStorage.getItem('accessToken');
    if (sessionToken) {
      token = sessionToken;
    } else if (!isAmbulanceContext) {
      // ONLY fallback to cookies if we are NOT explicitly in an ambulance personnel session
      // This prevents a helpdesk cookie in another tab from being used here
      token = getCookie('accessToken');
    }
  }

  // 🚀 SANITIZATION: Remove surrounding quotes (common if stored via some JSON utils)
  if (token && typeof token === 'string' && token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  console.log('🚨 Emergency API Client:', { path, hasToken: !!token, isAmbulanceContext });
  
  // ✅ MULTI-TENANCY: Inject X-Hospital-Id
  const activeHospitalId = typeof window !== "undefined" ? localStorage.getItem("activeHospitalId") : null;

  // Construct headers
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  // Merge existing headers if any
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => headers.set(key, value));
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => headers.set(key, value));
    } else {
      Object.entries(options.headers).forEach(([key, value]) => headers.set(key, value));
    }
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log('🔑 Token added to request');
  } else {
    console.warn('⚠️  No token found for emergency API call');
  }

  // ✅ CSRF PROTECTION: Double Submit Cookie
  const csrfToken = getCookie("csrf_token");
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  // ✅ ENFORCE SESSION ISOLATION
  const sessionId = typeof window !== "undefined" ? localStorage.getItem("sessionId") : null;
  if (sessionId) {
    headers.set("X-Session-Id", sessionId);
  }

  if (activeHospitalId) {
    headers.set("X-Hospital-Id", activeHospitalId);
  }

  const url = `${API_CONFIG.BASE_URL}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    }).catch((fetchError) => {
      if (isClient && fetchError.message === 'Failed to fetch') {
        useOnlineStore.getState().setOnline(false);
      }
      console.error(`Network error calling ${path}:`, fetchError);
      const networkError = new Error(
        fetchError.message === 'Failed to fetch'
          ? `Cannot connect to server. Please ensure the backend is running at ${API_CONFIG.BASE_URL}`
          : `Network error: ${fetchError.message}`
      );
      (networkError as any).isNetworkError = true;
      throw networkError;
    });

    // Handle 401 Unauthorized or 409 Conflict - use EMERGENCY refresh endpoint
    if ((res.status === 401 || res.status === 409) && isClient && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
        
        // If 409, another request in this tab is already refreshing. 
        // We just need to wait for it.
        if (isRefreshing) {
            console.log('⏳ Another emergency refresh in progress, waiting...');
            return new Promise<T>((resolve, reject) => {
              subscribeTokenRefresh((newToken) => {
                headers.set('Authorization', `Bearer ${newToken}`);
                fetch(url, { ...options, headers, credentials: "include" })
                  .then(resp => {
                    if (!resp.ok) return resp.json().then(err => { throw new Error(err.message || `HTTP ${resp.status}`) });
                    return resp.json();
                  })
                  .then(resolve)
                  .catch(reject);
              });
            });
        }

        isRefreshing = true;
        console.log('🔄 Refreshing emergency token (from cookie)...');

        try {
            const refreshRes = await fetch(`${API_CONFIG.BASE_URL}/emergency/auth/refresh`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
                ...(sessionId && { 'X-Session-Id': sessionId })
              },
              credentials: "include",
            });

            if (refreshRes.ok) {
              const data = await refreshRes.json();
              const newAccessToken = data.accessToken || (data.tokens && data.tokens.accessToken);

              if (newAccessToken) {
                  const { setAccessToken } = await import('./apiClient');
                  setAccessToken(newAccessToken); // ✅ SYNC with in-memory cache
                  
                  localStorage.setItem('accessToken', newAccessToken);
                  if (data.sessionId) {
                      localStorage.setItem('sessionId', data.sessionId);
                  }
                  
                  console.log('✅ Emergency token refreshed');
                  isRefreshing = false;
                  onTokenRefreshed(newAccessToken);
                  
                  // Retry the original request
                  headers.set('Authorization', `Bearer ${newAccessToken}`);
                  const retryRes = await fetch(url, { ...options, headers, credentials: "include" });
                  if (!retryRes.ok) throw new Error('Retry failed');
                  return retryRes.json();
              } else {
                  throw new Error('No access token in refresh response');
              }
            } else if (refreshRes.status === 409) {
                // Backend says another request is rotating. Wait for it.
                // This is specifically for multi-tab or extremely fast concurrent hits.
                console.warn('⚠️ Concurrent rotation on backend (409). Waiting for signal...');
                // We'll reset isRefreshing since we aren't the winner, and wait for the subscriber notify
                isRefreshing = false;
                return new Promise<T>((resolve, reject) => {
                  subscribeTokenRefresh((newToken) => {
                    headers.set('Authorization', `Bearer ${newToken}`);
                    fetch(url, { ...options, headers, credentials: "include" })
                      .then(resp => resp.json())
                      .then(resolve)
                      .catch(reject);
                  });
                });
            } else {
              throw new Error('Refresh failed');
            }
        } catch (error) {
            console.error('❌ Emergency refresh error:', error);
            isRefreshing = false;
            // Only logout if it's truly a 401/expired session, not a network error
            if (error instanceof Error && error.message.includes('Session expired')) {
                localStorage.removeItem('accessToken');
                window.dispatchEvent(new Event('auth-logout'));
                window.location.href = '/emergency/login';
            }
            throw error;
        }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'API Error' }));
      if (res.status !== 404) {
        console.error(`❌ Emergency API Error [${res.status}] ${path}:`, errorData);
      }
      const errorMessage = errorData.message || `HTTP ${res.status}`;
      const error = new Error(errorMessage);
      (error as any).status = res.status;
      (error as any).error = errorData.error || errorData;
      throw error;
    }

    return res.json();
  } catch (error: any) {
    if (error?.status !== 404 && !error?.message?.includes('404')) {
      console.error(`❌ Emergency API Error ${path}:`, error);
    }
    throw error;
  }
}
