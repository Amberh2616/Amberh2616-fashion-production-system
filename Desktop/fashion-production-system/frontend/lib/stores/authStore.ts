/**
 * Authentication Store (Zustand)
 */
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { login as apiLogin, refreshToken as apiRefreshToken, TokenPair } from '@/lib/api/auth';

// Custom storage that checks rememberMe flag
const createAuthStorage = (): StateStorage => ({
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    // Try localStorage first (remember me), then sessionStorage
    return localStorage.getItem(name) || sessionStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    // Check if rememberMe is enabled from the stored state
    const state = JSON.parse(value);
    if (state?.state?.rememberMe) {
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name);
    } else {
      sessionStorage.setItem(name, value);
      localStorage.removeItem(name);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
});

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  rememberMe: boolean;

  // Actions
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  clearError: () => void;
  setRememberMe: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      rememberMe: false,

      login: async (username: string, password: string, rememberMe = false) => {
        set({ isLoading: true, error: null, rememberMe });
        try {
          const tokens: TokenPair = await apiLogin({ username, password });
          set({
            accessToken: tokens.access,
            refreshToken: tokens.refresh,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            rememberMe,
          });
          return true;
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Login failed',
            isAuthenticated: false,
          });
          return false;
        }
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          rememberMe: false,
        });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          set({ isAuthenticated: false });
          return false;
        }

        try {
          const result = await apiRefreshToken(refreshToken);
          set({ accessToken: result.access });
          return true;
        } catch {
          // Refresh failed, logout
          set({
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          return false;
        }
      },

      clearError: () => set({ error: null }),
      setRememberMe: (value: boolean) => set({ rememberMe: value }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => createAuthStorage()),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
      }),
    }
  )
);

/**
 * Get access token for API requests
 */
export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return useAuthStore.getState().isAuthenticated;
}
