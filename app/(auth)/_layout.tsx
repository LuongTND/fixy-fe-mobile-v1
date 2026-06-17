import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { useAuthStore } from '@/store/store';
import { selectAuthRole } from '@/hooks/useProtectedRoute';

export default function AuthLayout() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const role = useAuthStore(selectAuthRole);

  React.useEffect(() => {
    if (isHydrating) return;

    if (isAuthenticated) {
      const timer = setTimeout(() => {
        if (role === 'worker') {
          router.replace('/(worker)/worker-home');
        } else if (role === 'customer') {
          router.replace('/(customer)/home');
        } else {
          // Corrupted session (token exists but no role): logout to recover
          useAuthStore.getState().logout().then(() => {
            router.replace('/(auth)/login');
          });
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isHydrating, role, router]);

  if (isHydrating || (isAuthenticated && role)) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
