import { Stack } from 'expo-router';
import { ProtectedScreen } from '@/components/ProtectedScreen';

export default function WorkerLayout() {
  return (
    <ProtectedScreen allowedRoles={['worker']}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          gestureEnabled: false,
        }}>
        <Stack.Screen name="worker-home" options={{ animation: 'none' }} />
        <Stack.Screen name="worker-setup" options={{ gestureEnabled: false }} />
        <Stack.Screen name="worker-jobs" options={{ animation: 'none' }} />
        <Stack.Screen name="worker-wallet" options={{ animation: 'none' }} />
        <Stack.Screen name="worker-profile" options={{ animation: 'none' }} />
        <Stack.Screen name="worker-job-detail" options={{ animation: 'none' }} />
        <Stack.Screen name="notifications" options={{ animation: 'none' }} />
      </Stack>
    </ProtectedScreen>
  );
}
