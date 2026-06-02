import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as React from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthButton } from '@/features/auth/components/auth-button';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { FORGOT_PASSWORD_OTP_PURPOSE, REGISTRATION_OTP_PURPOSE } from '@/features/auth/constants';
import { sendOtp, verifyOtp } from '@/features/auth/services/auth-api';
import { extractAuthTokens } from '@/features/auth/tokens';
import { validateOtpForm } from '@/features/auth/validation';
import { getApiErrorMessage } from '@/services/api/client';
import { useAuthStore } from '@/store/store';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const pendingOtpTarget = useAuthStore((state) => state.pendingOtpTarget);
  const pendingOtpPurpose = useAuthStore((state) => state.pendingOtpPurpose);
  const saveAuth = useAuthStore((state) => state.saveAuth);
  const [digits, setDigits] = React.useState(Array.from({ length: OTP_LENGTH }, () => ''));
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const inputs = React.useRef<(TextInput | null)[]>([]);

  React.useEffect(() => {
    if (!pendingOtpTarget) router.replace('/register');
  }, [pendingOtpTarget]);

  function setDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    setDigits(nextDigits);

    if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  async function onVerify() {
    const validation = validateOtpForm(digits);
    setError(validation.valid ? '' : (validation.errors.otpCode ?? ''));

    if (!pendingOtpTarget || !validation.valid) return;

    setLoading(true);
    try {
      const response = await verifyOtp(pendingOtpTarget, validation.values.otpCode);

      if (pendingOtpPurpose === FORGOT_PASSWORD_OTP_PURPOSE) {
        Alert.alert('Thành công', 'Xác thực OTP thành công. Vui lòng thiết lập mật khẩu mới.', [
          {
            text: 'OK',
            onPress: () => {
              router.push({
                pathname: '/reset-password' as any,
                params: { target: pendingOtpTarget },
              });
            },
          },
        ]);
        return;
      }

      const tokens = extractAuthTokens(response);

      if (tokens) {
        await saveAuth(tokens, pendingOtpTarget);
        Alert.alert('Thành công', 'Tài khoản đã được xác thực.', [
          { text: 'OK', onPress: () => router.replace('/location-setup' as any) },
        ]);
      } else {
        Alert.alert('Thành công', 'Tài khoản đã được xác thực. Vui lòng đăng nhập.', [
          { text: 'OK', onPress: () => router.replace('/login' as any) },
        ]);
      }
    } catch (apiError) {
      setError(getApiErrorMessage(apiError));
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!pendingOtpTarget) return;

    setResending(true);
    setError('');
    try {
      await sendOtp(pendingOtpTarget, pendingOtpPurpose ?? REGISTRATION_OTP_PURPOSE);
      Alert.alert('Đã gửi mã', 'Vui lòng kiểm tra tin nhắn OTP mới.');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={26} color="#1B1C1C" />
          </Pressable>
          <Text style={styles.brand}>Fixy (VUA THỢ)</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.headline}>Xác thực tài khoản</Text>
          <Text style={styles.subtitle}>
            Nhập mã OTP được gửi đến{'\n'}
            <Text style={styles.highlight}>{pendingOtpTarget}</Text>
          </Text>
        </View>

        <View style={styles.otpRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(input) => {
                inputs.current[index] = input;
              }}
              value={digit}
              onChangeText={(value) => setDigit(index, value)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
                  inputs.current[index - 1]?.focus();
                }
              }}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              style={styles.otpInput}
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.timer}>
          Mã sẽ hết hạn sau <Text style={styles.highlight}>00:45</Text>
        </Text>

        <View style={styles.actions}>
          <AuthButton
            label="Xác nhận"
            loading={loading}
            disabled={digits.some((digit) => !digit)}
            onPress={onVerify}
          />
          <Pressable disabled={resending} onPress={onResend}>
            <Text
              style={{
                ...styles.resend,
                ...(resending ? styles.disabledText : {}),
              }}>
              {resending ? 'Đang gửi lại...' : 'Gửi lại mã'}
            </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    marginLeft: 6,
    color: '#8F3F00',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
  },
  hero: {
    alignItems: 'center',
    marginTop: 24,
  },
  headline: {
    color: '#1B1C1C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 36,
    lineHeight: 44,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 18,
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
  },
  highlight: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 24,
  },
  otpInput: {
    height: 70,
    width: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF8228',
    backgroundColor: '#FFFFFF',
    color: '#1B1C1C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    textAlign: 'center',
  },
  error: {
    marginTop: 16,
    color: '#BA1A1A',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  timer: {
    marginTop: 34,
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 20,
    textAlign: 'center',
  },
  actions: {
    gap: 28,
    marginTop: 32,
    paddingTop: 16,
    paddingBottom: 20,
  },
  resend: {
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 20,
    textAlign: 'center',
  },
  disabledText: {
    opacity: 0.6,
  },
});
