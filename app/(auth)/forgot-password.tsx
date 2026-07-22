import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton } from '@/features/auth/components/auth-button';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { AuthTextField } from '@/features/auth/components/auth-text-field';
import { FORGOT_PASSWORD_OTP_PURPOSE } from '@/features/auth/constants';
import { forgotPassword } from '@/features/auth/services/auth-api';
import { FieldErrors, validateForgotPasswordForm } from '@/features/auth/validation';
import { getApiErrorMessage } from '@/services/api/client';
import { useAuthStore } from '@/store/store';

export default function ForgotPasswordScreen() {
  const setPendingOtp = useAuthStore((state) => state.setPendingOtp);
  const [target, setTarget] = React.useState('');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [apiError, setApiError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function onSubmit() {
    const validation = validateForgotPasswordForm({ target });
    setErrors(validation.errors);
    setApiError('');

    if (!validation.valid) return;

    setLoading(true);
    try {
      await forgotPassword(validation.values.target);
      setPendingOtp(validation.values.target, FORGOT_PASSWORD_OTP_PURPOSE);
      Alert.alert(
        'Đã gửi yêu cầu',
        'Vui lòng kiểm tra tin nhắn hoặc email để tiếp tục đặt lại mật khẩu.',
        [{ text: 'OK', onPress: () => router.push('/otp' as any) }]
      );
    } catch (apiError) {
      setApiError(getApiErrorMessage(apiError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={26} color="#574237" />
          </Pressable>
          <Text style={styles.title}>Quên mật khẩu</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.headline}>Đặt lại mật khẩu</Text>
          <Text style={styles.subtitle}>
            Nhập email hoặc số điện thoại đã đăng ký. Fixy sẽ gửi hướng dẫn khôi phục tài khoản.
          </Text>
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
        </View>
        {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

        <View style={styles.actions}>
          <AuthButton label="Gửi hướng dẫn" loading={loading} onPress={onSubmit} />

          <Pressable style={styles.loginLink} onPress={() => router.replace('/login' as any)}>
            <Text style={styles.loginLinkText}>Quay lại đăng nhập</Text>
          </Pressable>
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
    marginTop: 28,
  },
  headline: {
    color: '#383838',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 30,
    lineHeight: 38,
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
    marginTop: 30,
  },
  apiError: {
    marginTop: 16,
    color: '#BA1A1A',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  actions: {
    gap: 20,
    marginTop: 28,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkText: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
  },
});
