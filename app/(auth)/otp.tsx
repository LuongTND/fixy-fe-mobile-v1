import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
  const { selectedRole } = useLocalSearchParams<{ selectedRole: string }>();
  const [digits, setDigits] = React.useState(Array.from({ length: OTP_LENGTH }, () => ''));
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [timerSeconds, setTimerSeconds] = React.useState(60);
  const inputs = React.useRef<(TextInput | null)[]>([]);

  React.useEffect(() => {
    if (!pendingOtpTarget) router.replace('/register');
  }, [pendingOtpTarget]);

  React.useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  function setDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    setDigits(nextDigits);

    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    const otpCode = nextDigits.join('');
    if (otpCode.length === OTP_LENGTH && !nextDigits.some((d) => !d)) {
      onVerify(nextDigits);
    }
  }

  async function onVerify(codeDigits?: string[]) {
    const activeDigits = Array.isArray(codeDigits) ? codeDigits : digits;
    const validation = validateOtpForm(activeDigits);
    setError(validation.valid ? '' : (validation.errors.otpCode ?? ''));

    if (!pendingOtpTarget || !validation.valid) return;

    setLoading(true);
    try {
      const response = await verifyOtp(pendingOtpTarget, validation.values.otpCode);

      if (pendingOtpPurpose === REGISTRATION_OTP_PURPOSE) {
        router.replace({
          pathname: '/register' as any,
          params: {
            target: pendingOtpTarget,
            selectedRole: selectedRole || '',
            isOtpVerified: 'true',
            step: '3',
          },
        });
        return;
      }

      if (pendingOtpPurpose === FORGOT_PASSWORD_OTP_PURPOSE) {
        router.replace({
          pathname: '/reset-password' as any,
          params: { target: pendingOtpTarget },
        });
        return;
      }

      const tokens = extractAuthTokens(response);

      if (tokens) {
        await saveAuth(tokens, pendingOtpTarget);
        router.replace('/location-setup' as any);
      } else {
        router.replace('/login' as any);
      }
    } catch (apiError) {
      setError(getApiErrorMessage(apiError));
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!pendingOtpTarget || timerSeconds > 0) return;

    setResending(true);
    setError('');
    try {
      await sendOtp(pendingOtpTarget, pendingOtpPurpose ?? REGISTRATION_OTP_PURPOSE);
      setDigits(Array.from({ length: OTP_LENGTH }, () => ''));
      setTimerSeconds(60);
      Alert.alert('Đã gửi mã', 'Vui lòng kiểm tra tin nhắn OTP mới.');
      setTimeout(() => {
        inputs.current[0]?.focus();
      }, 200);
    } catch (apiError) {
      const errMsg = getApiErrorMessage(apiError);
      setError(errMsg);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={26} color="#0F382C" />
          </Pressable>
          <Text style={styles.brand}>Fixy</Text>
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
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.timer}>
          {timerSeconds > 0 ? (
            <>
              Mã sẽ hết hạn sau <Text style={styles.highlight}>{formatTime(timerSeconds)}</Text>
            </>
          ) : (
            'Mã OTP đã hết hạn'
          )}
        </Text>

        <View style={styles.actions}>
          <AuthButton
            label="Xác nhận"
            loading={loading}
            disabled={digits.some((digit) => !digit)}
            onPress={() => onVerify()}
          />
          <Pressable disabled={resending || timerSeconds > 0} onPress={onResend}>
            <Text
              style={{
                ...styles.resend,
                ...(resending || timerSeconds > 0 ? styles.disabledText : {}),
              }}>
              {resending
                ? 'Đang gửi lại...'
                : timerSeconds > 0
                  ? `Gửi lại mã (${timerSeconds}s)`
                  : 'Gửi lại mã'}
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
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
  },
  hero: {
    alignItems: 'center',
    marginTop: 24,
  },
  headline: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 14,
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  highlight: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 24,
  },
  otpInput: {
    height: 58,
    width: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0F382C',
    backgroundColor: '#FFFFFF',
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
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
    marginTop: 24,
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    gap: 24,
    marginTop: 28,
    paddingTop: 16,
    paddingBottom: 20,
  },
  resend: {
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
    textAlign: 'center',
  },
  disabledText: {
    opacity: 0.6,
  },
});
