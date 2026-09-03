import * as Location from 'expo-location';
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

export type UserCoordinates = { lat: number; lng: number };

export type LocationState = {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  userLocation: UserCoordinates | null;
  setUserLocation: (loc: UserCoordinates | null) => void;
  fetchUserLocation: () => Promise<UserCoordinates | null>;
};

export const useLocationStore = create<LocationState>((set, get) => ({
  selectedCity: 'Đà Nẵng',
  setSelectedCity: (city: string) => set({ selectedCity: city }),
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),
  fetchUserLocation: async () => {
    const existing = get().userLocation;
    if (existing) return existing;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        set({ userLocation: loc });
        return loc;
      }
    } catch (err) {
      console.warn('[useLocationStore] GPS location error:', err);
    }
    return null;
  },
}));
