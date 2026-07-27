import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton } from '@/features/auth/components/auth-button';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { AuthTextField } from '@/features/auth/components/auth-text-field';
import { resetPassword } from '@/features/auth/services/auth-api';
import { FieldErrors, validateResetPasswordForm } from '@/features/auth/validation';
import { getApiErrorMessage } from '@/services/api/client';

export default function ResetPasswordScreen() {
  const { target } = useLocalSearchParams<{ target: string }>();
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [apiError, setApiError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!target) {
      Alert.alert('Lỗi', 'Thông tin yêu cầu đặt lại mật khẩu không hợp lệ.', [
        { text: 'OK', onPress: () => router.replace('/login' as any) },
      ]);
    }
  }, [target]);

  async function onSubmit() {
    const validation = validateResetPasswordForm({ password, confirmPassword });
    setErrors(validation.errors);
    setApiError('');

    if (!validation.valid || !target) return;

    setLoading(true);
    try {
      await resetPassword(target, validation.values.password);
      Alert.alert('Thành công', 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.', [
        { text: 'OK', onPress: () => router.replace('/login' as any) },
      ]);
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
            <MaterialIcons name="arrow-back" size={26} color="#0F382C" />
          </Pressable>
          <Text style={styles.title}>Quên mật khẩu</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.headline}>Thiết lập mật khẩu</Text>
          <Text style={styles.subtitle}>
            Nhập mật khẩu mới cho tài khoản của bạn để tiếp tục sử dụng dịch vụ.
          </Text>
        </View>

        <View style={styles.form}>
          <AuthTextField
            icon="lock"
            value={password}
            onChangeText={setPassword}
            placeholder="Mật khẩu mới"
            secureTextEntry
            error={errors.password}
          />
          <AuthTextField
            icon="lock"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Xác nhận mật khẩu mới"
            secureTextEntry
            error={errors.confirmPassword}
          />
        </View>
        {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

        <View style={styles.actions}>
          <AuthButton label="Cập nhật mật khẩu" loading={loading} onPress={onSubmit} />

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
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
  },
  hero: {
    alignItems: 'center',
    marginTop: 28,
  },
  headline: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 30,
    lineHeight: 38,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 14,
    color: '#6B7280',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  form: {
    marginTop: 30,
    gap: 14,
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
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
  },
});
