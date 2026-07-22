import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { AuthTokens } from '@/features/auth/tokens';

const ACCESS_TOKEN_KEY = 'fixy.accessToken';
const REFRESH_TOKEN_KEY = 'fixy.refreshToken';

export type AuthState = {
  accessToken?: string;
  refreshToken?: string;
  target?: string;
  pendingOtpTarget?: string;
  pendingOtpPurpose?: number;
  isAuthenticated: boolean;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
  setPendingOtp: (target: string, purpose: number) => void;
  saveAuth: (tokens: AuthTokens, target?: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: undefined,
  refreshToken: undefined,
  target: undefined,
  pendingOtpTarget: undefined,
  pendingOtpPurpose: undefined,
  isAuthenticated: false,
  isHydrating: true,
  hydrate: async () => {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);

      set({
        accessToken: accessToken ?? undefined,
        refreshToken: refreshToken ?? undefined,
        isAuthenticated: Boolean(accessToken),
        isHydrating: false,
      });
    } catch {
      set({ isHydrating: false });
    }
  },
  setPendingOtp: (target, purpose) => {
    set({ pendingOtpTarget: target, pendingOtpPurpose: purpose });
  },
  saveAuth: async (tokens, target) => {
    try {
      if (tokens.accessToken) {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
      } else {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      }
      if (tokens.refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
      } else {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    } catch {
      // Ignored for environments without SecureStore support
    }

    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      target,
      isAuthenticated: Boolean(tokens.accessToken),
    });
  },
  logout: async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
    } catch {
      // Ignored
    }

    set({
      accessToken: undefined,
      refreshToken: undefined,
      target: undefined,
      pendingOtpTarget: undefined,
      pendingOtpPurpose: undefined,
      isAuthenticated: false,
      isHydrating: false,
    });
  },
}));
