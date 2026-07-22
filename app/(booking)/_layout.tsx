import { Stack } from 'expo-router';
import { ProtectedScreen } from '@/components/ProtectedScreen';

export default function BookingLayout() {
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
