import { Stack } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        gestureEnabled: false,
      }}>
      <Stack.Screen name="home" options={{ animation: 'none' }} />
      <Stack.Screen name="orders" options={{ animation: 'none' }} />
      <Stack.Screen name="profile" options={{ animation: 'none' }} />
      <Stack.Screen name="saved-addresses" options={{ animation: 'none' }} />
      <Stack.Screen name="service-workers" options={{ animation: 'none' }} />
      <Stack.Screen name="user-wallet" />
      <Stack.Screen name="worker-detail" options={{ animation: 'none' }} />
    </Stack>
  );
}
