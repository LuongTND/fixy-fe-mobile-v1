import { useRouter } from 'expo-router';
import * as React from 'react';

import { AuthState, useAuthStore } from '@/store/store';

export type ProtectedRole = 'worker' | 'customer';

type AuthStateWithRole = AuthState & {
  role?: unknown;
  roles?: unknown;
  userRole?: unknown;
  user?: {
    role?: unknown;
    roles?: unknown;
  };
};

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function normalizeRole(value: unknown): ProtectedRole | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeRole(item);
      if (normalized) return normalized;
    }
    return undefined;
  }

  if (typeof value !== 'string') return undefined;

  const role = value.trim().toLowerCase();
  if (role === 'worker' || role === 'customer') return role;
  return undefined;
}

export function selectAuthRole(state: AuthState): ProtectedRole | undefined {
  const authState = state as AuthStateWithRole;

  // 1. Try direct values (e.g. if loaded dynamically/manually in store)
  const direct =
    normalizeRole(authState.role) ??
    normalizeRole(authState.userRole) ??
    normalizeRole(authState.roles) ??
    normalizeRole(authState.user?.role) ??
    normalizeRole(authState.user?.roles);

  if (direct) return direct;

  // 2. Derive from access token claims
  if (authState.accessToken) {
    try {
      const payload = parseJwt(authState.accessToken);
      if (payload) {
        const claim =
          payload.role ??
          payload.roles ??
          payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        const normalized = normalizeRole(claim);
        if (normalized) return normalized;
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback to target string (for local development/testing)
  if (authState.target) {
    const targetLower = authState.target.toLowerCase();
    if (targetLower.includes('worker') || targetLower.includes('tho')) {
      return 'worker';
    }
    if (targetLower.includes('customer') || targetLower.includes('khach')) {
      return 'customer';
    }
  }

  return undefined;
}

export function useProtectedRoute(allowedRoles: ProtectedRole[]) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const role = useAuthStore(selectAuthRole);
  const allowedRolesKey = allowedRoles.join('|');
  const canRender = !isHydrating && isAuthenticated && !!role && allowedRoles.includes(role);

  React.useEffect(() => {
    if (isHydrating) return;

    if (!isAuthenticated) {
      const timer = setTimeout(() => {
        router.replace('/(auth)/login');
      }, 0);
      return () => clearTimeout(timer);
    }

    if (!role || !allowedRoles.includes(role)) {
      const timer = setTimeout(() => {
        if (role === 'worker') {
          router.replace('/(worker)/worker-home');
        } else {
          router.replace('/(customer)/home');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [allowedRoles, allowedRolesKey, isAuthenticated, isHydrating, router, role]);

  return canRender;
}
