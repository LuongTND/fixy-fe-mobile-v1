import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as React from 'react';
import { Alert, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton } from '@/features/auth/components/auth-button';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { AuthTextField } from '@/features/auth/components/auth-text-field';
import { GoogleIcon } from '@/features/auth/components/google-icon';
import { login as loginRequest } from '@/features/auth/services/auth-api';
import { extractAuthTokens } from '@/features/auth/tokens';
import { FieldErrors, validateLoginForm } from '@/features/auth/validation';
import { apiClient, getApiErrorMessage } from '@/services/api/client';
import { useAuthStore } from '@/store/store';

export default function LoginScreen() {
  const saveAuth = useAuthStore((state) => state.saveAuth);

  React.useEffect(() => {
    const backAction = () => {
      router.replace('/');
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  function googleSignIn() {
    Alert.alert('Đăng nhập Google', 'Tính năng đăng nhập Google đang được phát triển.');
  }
  const [target, setTarget] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [apiError, setApiError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function onSubmit() {
    const validation = validateLoginForm({ target, password });
    setErrors(validation.errors);
    setApiError('');

    if (!validation.valid) return;

    setLoading(true);
    try {
      const response = await loginRequest(validation.values.target, validation.values.password);
      const tokens = extractAuthTokens(response);

      if (tokens) {
        await saveAuth(tokens, validation.values.target);

        let isWorker = false;
        const targetLower = validation.values.target.toLowerCase();
        const pwdLower = validation.values.password.toLowerCase();

        const roles = response.data?.roles || response?.roles;
        if (Array.isArray(roles)) {
          if (roles.includes('WORKER')) {
            isWorker = true;
          } else if (roles.includes('CUSTOMER')) {
            isWorker = false;
          }
        } else if (
          targetLower.includes('worker') ||
          targetLower.includes('tho') ||
          pwdLower.includes('worker')
        ) {
          isWorker = true;
        } else {
          try {
            const profileRes = await apiClient.get('/worker-profiles/me');
            // If the endpoint returns a valid profile (meaning user is registered as a worker)
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
    } catch (error) {
      const errMsg = getApiErrorMessage(error);
      setApiError(errMsg);
      Alert.alert('Đăng nhập thất bại', errMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace('/')}>
            <MaterialIcons name="arrow-back" size={26} color="#574237" />
          </Pressable>
          <Text style={styles.title}>Đăng nhập</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.headline}>Chào mừng trở lại</Text>
          <Text style={styles.subtitle}>Đăng nhập để tiếp tục đặt dịch vụ Fixy.</Text>
        </View>

        <View style={styles.form}>
          <AuthTextField
            icon="person"
            value={target}
            onChangeText={setTarget}
            placeholder="Email hoặc số điện thoại"
            keyboardType="default"
            error={errors.target}
          />
          <AuthTextField
            icon="lock"
            value={password}
            onChangeText={setPassword}
            placeholder="Mật khẩu"
            secureTextEntry
            error={errors.password}
          />
          <Pressable
            style={styles.forgotPasswordButton}
            onPress={() => router.push('/forgot-password' as any)}>
            <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
          </Pressable>
        </View>

        {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

        <View style={styles.actions}>
          <AuthButton label="Đăng nhập" loading={loading} onPress={onSubmit} />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>hoặc</Text>
            <View style={styles.divider} />
          </View>

          <Pressable
            style={styles.googleButton}
            onPress={googleSignIn}>
            <GoogleIcon size={24} />
            <Text style={styles.googleText}>Tiếp tục với Google</Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <Pressable onPress={() => router.replace('/register' as any)}>
              <Text style={styles.linkText}>Đăng ký</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  header: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: -4,
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#1B1C1C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
  },
  hero: {
    alignItems: 'center',
    marginTop: 24,
  },
  headline: {
    color: '#383838',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 14,
    color: '#574237',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  form: {
    gap: 14,
    marginTop: 24,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  forgotPasswordText: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  apiError: {
    marginTop: 16,
    color: '#BA1A1A',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  actions: {
    gap: 22,
    marginTop: 24,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: '#574237',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
  },
  linkText: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 4,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDDDDD',
  },
  dividerText: {
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
  },
  googleButton: {
    height: 52,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
  },
  googleText: {
    color: '#574237',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 18,
  },
});
