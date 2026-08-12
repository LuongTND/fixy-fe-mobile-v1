import Constants from 'expo-constants';
import { Alert } from 'react-native';

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

  const webClientId = Constants.expoConfig?.extra?.googleWebClientId || '';
  const iosClientId = Constants.expoConfig?.extra?.googleIosClientId || '';

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
 * - On Expo Go (or when native module is missing): shows developer prompt for token input.
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
    } catch (error: any) {
      if (error?.code === statusCodes?.SIGN_IN_CANCELLED) {
        // User cancelled the sign in flow
        return null;
      }
      if (error?.code === statusCodes?.IN_PROGRESS) {
        // Operation in progress
        return null;
      }
      console.warn('[GoogleAuth] Native Sign-In failed, checking fallback:', error);
    }
  }

  // Fallback for Expo Go / Dev mode testing
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
