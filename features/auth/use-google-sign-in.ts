import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';
import { Alert, Platform } from 'react-native';

import {
  buildGoogleAuthRedirectOptions,
  buildGoogleAuthRequestConfig,
} from '@/features/auth/google-auth-config';
import { loginWithGoogle } from '@/features/auth/services/auth-api';
import { extractAuthTokens } from '@/features/auth/tokens';
import { apiClient, getApiErrorMessage } from '@/services/api/client';
import { useAuthStore } from '@/store/store';

// Required for web browser redirect on iOS/Android
WebBrowser.maybeCompleteAuthSession();

export function useGoogleSignIn() {
  const saveAuth = useAuthStore((state) => state.saveAuth);
  const [loading, setLoading] = React.useState(false);

  const googleClientId = Constants.expoConfig?.extra?.googleClientId;
  const googleIosClientId = Constants.expoConfig?.extra?.googleIosClientId;
  const googleAndroidClientId = Constants.expoConfig?.extra?.googleAndroidClientId;
  const googleIosRedirectScheme = Constants.expoConfig?.extra?.googleIosRedirectScheme;

  const googleAuthRequestConfig = React.useMemo(
    () =>
      buildGoogleAuthRequestConfig({
        googleClientId,
        googleIosClientId,
        googleAndroidClientId,
      }),
    [googleAndroidClientId, googleClientId, googleIosClientId]
  );
  const googleAuthRedirectOptions = React.useMemo(
    () => buildGoogleAuthRedirectOptions(googleIosRedirectScheme),
    [googleIosRedirectScheme]
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    googleAuthRequestConfig,
    googleAuthRedirectOptions
  );

  // Handle the Google auth response
  React.useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        handleGoogleLogin(idToken);
      } else {
        Alert.alert('Đăng nhập Google', 'Không thể lấy thông tin xác thực từ Google.');
        setLoading(false);
      }
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      setLoading(false);
    } else {
      Alert.alert('Đăng nhập Google', 'Xác thực Google không thành công.');
      setLoading(false);
    }
  }, [response]);

  async function handleGoogleLogin(idToken: string) {
    try {
      const res = await loginWithGoogle(idToken);
      const tokens = extractAuthTokens(res);

      if (tokens) {
        await saveAuth(tokens);

        // Determine user role
        let isWorker = false;
        const roles = res.data?.roles || res?.roles;
        if (Array.isArray(roles)) {
          if (roles.includes('WORKER')) {
            isWorker = true;
          }
        } else {
          try {
            const profileRes = await apiClient.get('/worker-profiles/me');
            if (profileRes.status === 200 && profileRes.data) {
              isWorker = true;
            }
          } catch {
            // Customer fallback
          }
        }

        if (isWorker) {
          router.replace('/worker-home' as any);
        } else {
          router.replace('/home' as any);
        }
      } else {
        Alert.alert('Đăng nhập thành công', 'Máy chủ đã xác thực đăng nhập.');
        router.replace('/home' as any);
      }
    } catch (error: any) {
      const errMsg = getApiErrorMessage(error);
      Alert.alert('Đăng nhập Google thất bại', errMsg);
    } finally {
      setLoading(false);
    }
  }

  const signIn = React.useCallback(async () => {
    if (!googleClientId) {
      Alert.alert('Lỗi cấu hình', 'Thiếu Google Client ID. Vui lòng kiểm tra .env.local.');
      return;
    }

    if (Constants.executionEnvironment === 'storeClient') {
      Alert.alert(
        'Google sign-in config',
        'Google sign-in requires a development build. It will not work in Expo Go.'
      );
      return;
    }

    if (Platform.OS === 'ios' && (!googleIosClientId || !googleIosRedirectScheme)) {
      Alert.alert(
        'Google sign-in config',
        'Missing GOOGLE_IOS_CLIENT_ID or GOOGLE_IOS_REDIRECT_SCHEME. Restart Expo after updating .env.local.'
      );
      return;
    }

    if (Platform.OS === 'android' && !googleAndroidClientId) {
      Alert.alert(
        'Google sign-in config',
        'Missing GOOGLE_ANDROID_CLIENT_ID. Restart Expo after updating .env.local.'
      );
      return;
    }

    if (!request) {
      Alert.alert('Google sign-in config', 'Google AuthSession is not ready yet. Please try again.');
      return;
    }

    console.log('[Google OAuth]', {
      executionEnvironment: Constants.executionEnvironment,
      platform: Platform.OS,
      clientId: googleClientId,
      iosClientId: googleIosClientId,
      androidClientId: googleAndroidClientId,
      redirectNative: googleAuthRedirectOptions?.native,
      requestUrl: request.url,
    });

    setLoading(true);
    try {
      await promptAsync();
    } catch (error: any) {
      const errMsg = getApiErrorMessage(error);
      Alert.alert('Đăng nhập Google thất bại', errMsg);
      setLoading(false);
    }
  }, [
    googleAndroidClientId,
    googleAuthRedirectOptions?.native,
    googleClientId,
    googleIosClientId,
    googleIosRedirectScheme,
    promptAsync,
    request,
  ]);

  return { signIn, loading };
}
