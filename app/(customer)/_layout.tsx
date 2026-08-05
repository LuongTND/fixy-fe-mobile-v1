import { Stack } from 'expo-router';
import { ProtectedScreen } from '@/components/ProtectedScreen';

export default function CustomerLayout() {
  return (
    <ProtectedScreen allowedRoles={['customer', 'worker']}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          gestureEnabled: false,
        }}>
        <Stack.Screen name="home" options={{ animation: 'none' }} />
        <Stack.Screen name="orders" options={{ animation: 'none' }} />
        <Stack.Screen name="profile" options={{ animation: 'none' }} />
        <Stack.Screen name="profile-info" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="saved-addresses" options={{ animation: 'none' }} />
        <Stack.Screen name="service-workers" options={{ animation: 'none' }} />
        <Stack.Screen name="spa-services" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="spa-list" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="spa-detail" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="user-wallet" options={{ animation: 'none' }} />
        <Stack.Screen name="worker-detail" options={{ animation: 'none' }} />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="notifications-settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="support-tickets" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="create-support-ticket" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="support-ticket-detail" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </ProtectedScreen>
  );
}
