import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';

let GoogleSignin: any = null;
let statusCodes: any = null;

try {
  const GoogleModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = GoogleModule.GoogleSignin;
  statusCodes = GoogleModule.statusCodes;
} catch {
  // Native module not available (e.g. running in Expo Go)
  GoogleSignin = null;
  statusCodes = null;
}

let isConfigured = false;

function configureGoogleSignin() {
  if (isConfigured || !GoogleSignin) return;

  const webClientId =
    Constants.expoConfig?.extra?.googleWebClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    '';
  const iosClientId =
    Constants.expoConfig?.extra?.googleIosClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    '';

  if (!webClientId) {
    console.warn(
      '[GoogleAuth] Warning: webClientId is empty. Google Sign-In requires webClientId to issue idToken.'
    );
  }

  try {
    GoogleSignin.configure({
      webClientId: webClientId || undefined,
      iosClientId: iosClientId || undefined,
      offlineAccess: false,
    });
    isConfigured = true;
  } catch (error) {
    console.warn('[GoogleAuth] Failed to configure GoogleSignin:', error);
  }
}

/**
 * Triggers Google Sign-In.
 * - On Native/Standalone builds: opens native Google Sign-In sheet/dialog.
 * - On Expo Go (or when native module is missing): shows developer prompt (iOS) or Alert (Android).
 */
export async function promptGoogleSignIn(): Promise<string | null> {
  // Try native Google Sign-In first
  if (GoogleSignin) {
    try {
      configureGoogleSignin();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      // Support both new & legacy response schemas from @react-native-google-signin
      const idToken = response?.data?.idToken ?? response?.idToken;
      if (idToken) {
        return idToken;
      }
      console.warn('[GoogleAuth] Google Sign-In completed but no idToken returned:', response);
    } catch (error: any) {
      if (error?.code === statusCodes?.SIGN_IN_CANCELLED) {
        // User cancelled the sign in flow
        return null;
      }
      if (error?.code === statusCodes?.IN_PROGRESS) {
        // Operation in progress
        return null;
      }

      console.error('[GoogleAuth] Native Sign-In failed:', error);

      if (
        error?.code === statusCodes?.DEVELOPER_ERROR ||
        error?.code === '10' ||
        String(error?.message).includes('DEVELOPER_ERROR')
      ) {
        Alert.alert(
          'Lỗi Đăng nhập Google (Code 10)',
          'Đăng nhập Google bị từ chối (DEVELOPER_ERROR). Nguyên nhân thường do:\n1. Chưa đăng ký SHA-1 Fingerprint của bản EAS Build lên Google Cloud Console.\n2. webClientId chưa đúng hoặc chưa được cấu hình.'
        );
        return null;
      }

      Alert.alert(
        'Đăng nhập Google thất bại',
        error?.message || 'Đã có lỗi xảy ra khi kết nối tới dịch vụ Google.'
      );
      return null;
    }
  }

  // Fallback for Expo Go / Dev mode testing
  if (Platform.OS === 'ios') {
    return new Promise((resolve) => {
      Alert.prompt(
        'Đăng nhập Google (Dev)',
        'Môi trường Expo Go chưa tích hợp Native Module. Nhập Google ID Token (Credential) để test:',
        [
          {
            text: 'Hủy',
            style: 'cancel',
            onPress: () => resolve(null),
          },
          {
            text: 'Đăng nhập',
            onPress: (credential?: string) => {
              if (credential) {
                resolve(credential.trim());
              } else {
                resolve(null);
              }
            },
          },
        ],
        'plain-text'
      );
    });
  }

  Alert.alert(
    'Yêu cầu Native Build',
    'Tính năng đăng nhập Google trên Android yêu cầu bản EAS Build (Development Client hoặc Standalone Preview) chứa Native Module.'
  );
  return null;
}
