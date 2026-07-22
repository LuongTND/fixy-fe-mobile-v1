import { Stack } from 'expo-router';
import { ProtectedScreen } from '@/components/ProtectedScreen';

export default function LocationLayout() {
  return (
    <ProtectedScreen allowedRoles={['customer', 'worker']}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </ProtectedScreen>
  );
}
