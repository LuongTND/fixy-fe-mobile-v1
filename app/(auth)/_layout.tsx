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
        } else {
          router.replace('/(customer)/home');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isHydrating, role, router]);

  if (isHydrating || isAuthenticated) {
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
