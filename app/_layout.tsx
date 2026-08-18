import 'react-native-gesture-handler';
import '@/global.css';

import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  useFonts,
} from '@expo-google-fonts/montserrat';
import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { NotificationPopupObserver } from '@/components/notifications/notification-popup-observer';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/store';
import { NAV_THEME } from '@/theme';

export { ErrorBoundary } from 'expo-router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const hydrate = useAuthStore((state) => state.hydrate);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FBF9F8',
        }}>
        <ActivityIndicator size="large" color="#FF8228" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NotificationPopupObserver />
        <StatusBar style="dark" />
        <KeyboardProvider>
          <ActionSheetProvider>
            <NavThemeProvider value={NAV_THEME[colorScheme]}>
              <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(customer)" options={{ gestureEnabled: false }} />
                <Stack.Screen name="(worker)" options={{ gestureEnabled: false }} />
                <Stack.Screen name="(booking)" />
                <Stack.Screen name="(location)" />
                <Stack.Screen name="+not-found" />
              </Stack>
            </NavThemeProvider>
          </ActionSheetProvider>
        </KeyboardProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

