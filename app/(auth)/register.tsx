import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Alert, Pressable, StyleSheet, Text, View, TextInput, ActivityIndicator } from 'react-native';

import { AuthButton } from '@/features/auth/components/auth-button';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { AuthTextField } from '@/features/auth/components/auth-text-field';
import { GoogleIcon } from '@/features/auth/components/google-icon';
import {
  CUSTOMER_ROLE_REGISTER,
  REGISTRATION_OTP_PURPOSE,
  WORKER_ROLE_REGISTER,
} from '@/features/auth/constants';
import { register, sendOtp, verifyOtp, login as loginRequest } from '@/features/auth/services/auth-api';
import { extractAuthTokens } from '@/features/auth/tokens';
import { FieldErrors, validateRegisterForm } from '@/features/auth/validation';
import { getApiErrorMessage } from '@/services/api/client';
import { useAuthStore } from '@/store/store';

type RegisterRole = 'customer' | 'worker';

const ROLE_REGISTER_VALUE: Record<RegisterRole, number> = {
  customer: CUSTOMER_ROLE_REGISTER,
  worker: WORKER_ROLE_REGISTER,
};

export default function RegisterScreen() {
  const saveAuth = useAuthStore((state) => state.saveAuth);
  const setPendingOtp = useAuthStore((state) => state.setPendingOtp);

  function googleSignIn() {
    Alert.alert('Đăng nhập Google', 'Tính năng đăng nhập Google đang được phát triển.');
  }

  const [step, setStep] = React.useState(1);
  const [selectedRole, setSelectedRole] = React.useState<RegisterRole | null>(null);

  // Form Fields
  const [fullName, setFullName] = React.useState('');
  const [target, setTarget] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [acceptedTerms, setAcceptedTerms] = React.useState(true);

  // Verification & Flow States
  const [isOtpSent, setIsOtpSent] = React.useState(false);
  const [isOtpVerified, setIsOtpVerified] = React.useState(false);
  const [sendingOtp, setSendingOtp] = React.useState(false);
  const [verifyingOtp, setVerifyingOtp] = React.useState(false);
  const [otpError, setOtpError] = React.useState('');
  const [otpDigits, setOtpDigits] = React.useState(Array.from({ length: 6 }, () => ''));
  const [cooldown, setCooldown] = React.useState(0);

  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [apiError, setApiError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const otpInputs = React.useRef<(TextInput | null)[]>([]);

  // Parse local search params on mount
  const params = useLocalSearchParams<{
    target?: string;
    selectedRole?: string;
    isOtpVerified?: string;
    step?: string;
  }>();

  React.useEffect(() => {
    if (params.target) setTarget(params.target);
    if (params.selectedRole) setSelectedRole(params.selectedRole as RegisterRole);
    if (params.isOtpVerified === 'true') setIsOtpVerified(true);
    if (params.step) setStep(parseInt(params.step, 10));
  }, [params]);

  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  function goBack() {
    if (step === 1) {
      router.back();
      return;
    }
    if (step === 2) {
      setStep(1);
      setSelectedRole(null);
      setTarget('');
      setIsOtpSent(false);
      setIsOtpVerified(false);
      setOtpDigits(Array.from({ length: 6 }, () => ''));
      setErrors({});
      setApiError('');
      setOtpError('');
      return;
    }
    if (step === 3) {
      setStep(2);
      return;
    }
  }

  async function handleSendOtp() {
    if (!target) {
      setErrors({ target: 'Vui lòng nhập số điện thoại hoặc email.' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(0|84)\d{9,10}$/;
    if (!emailRegex.test(target) && !phoneRegex.test(target)) {
      setErrors({ target: 'Email hoặc số điện thoại không hợp lệ.' });
      return;
    }

    setErrors({});
    setSendingOtp(true);
    setOtpError('');
    try {
      await sendOtp(target, REGISTRATION_OTP_PURPOSE);
      setPendingOtp(target, REGISTRATION_OTP_PURPOSE);
      setIsOtpSent(true);
      setCooldown(60);
      setOtpDigits(Array.from({ length: 6 }, () => ''));
      
      // Navigate immediately to OTP screen
      router.push({
        pathname: '/otp' as any,
        params: {
          selectedRole: selectedRole || '',
        }
      });
    } catch (error) {
      const errMsg = getApiErrorMessage(error);
      setErrors({ target: errMsg });
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp(otpCode: string) {
    setVerifyingOtp(true);
    setOtpError('');
    try {
      await verifyOtp(target, otpCode);
      setIsOtpVerified(true);
      setOtpError('');
      Alert.alert('Xác thực thành công', 'Thông tin liên hệ của bạn đã được xác minh.', [
        { text: 'Tiếp tục', onPress: () => setStep(3) },
      ]);
    } catch (error) {
      setOtpError(getApiErrorMessage(error));
      setOtpDigits(Array.from({ length: 6 }, () => ''));
      otpInputs.current[0]?.focus();
    } finally {
      setVerifyingOtp(false);
    }
  }

  function setDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = digit;
    setOtpDigits(nextDigits);

    if (digit && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }

    const otpCode = nextDigits.join('');
    if (otpCode.length === 6) {
      handleVerifyOtp(otpCode);
    }
  }

  async function onSubmit() {
    if (!selectedRole) {
      setApiError('Vui lòng chọn loại tài khoản.');
      return;
    }

    if (!isOtpVerified) {
      setApiError('Vui lòng xác thực số điện thoại/email trước khi đăng ký.');
      return;
    }

    const validation = validateRegisterForm({
      fullName,
      target,
      password,
      confirmPassword,
      acceptedTerms,
    });
    setErrors(validation.errors);
    setApiError('');

    if (!validation.valid) return;

    setLoading(true);
    try {
      await register({
        ...validation.values,
        roleRegister: ROLE_REGISTER_VALUE[selectedRole],
      });

      // Auto login
      const response = await loginRequest(validation.values.target, validation.values.password);
      const tokens = extractAuthTokens(response);

      if (tokens) {
        await saveAuth(tokens, validation.values.target);
        if (selectedRole === 'worker') {
          router.replace('/(worker)/worker-home' as any);
        } else {
          router.replace('/home' as any);
        }
      } else {
        Alert.alert('Đăng ký thành công', 'Vui lòng đăng nhập để tiếp tục.');
        router.replace('/login' as any);
      }
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={goBack}>
            <MaterialIcons name="arrow-back" size={26} color="#574237" />
          </Pressable>
          <Text style={styles.title}>Đăng ký tài khoản</Text>
        </View>

        {selectedRole ? (
          <RegisterForm
            selectedRole={selectedRole}
            step={step}
            setStep={setStep}
            fullName={fullName}
            target={target}
            password={password}
            confirmPassword={confirmPassword}
            acceptedTerms={acceptedTerms}
            isOtpSent={isOtpSent}
            isOtpVerified={isOtpVerified}
            sendingOtp={sendingOtp}
            verifyingOtp={verifyingOtp}
            otpDigits={otpDigits}
            cooldown={cooldown}
            errors={errors}
            apiError={apiError}
            otpError={otpError}
            loading={loading}
            otpInputs={otpInputs}
            onChangeRole={() => {
              setSelectedRole(null);
              setStep(1);
              setTarget('');
              setIsOtpSent(false);
              setIsOtpVerified(false);
              setErrors({});
              setApiError('');
              setOtpError('');
            }}
            onChangeFullName={setFullName}
            onChangeTarget={(val) => {
              setTarget(val);
              if (isOtpSent) setIsOtpSent(false);
              if (isOtpVerified) setIsOtpVerified(false);
              setOtpError('');
            }}
            onChangePassword={setPassword}
            onChangeConfirmPassword={setConfirmPassword}
            onToggleTerms={() => setAcceptedTerms((value) => !value)}
            onSendOtp={handleSendOtp}
            onSetDigit={setDigit}
            onSubmit={onSubmit}
            onGoogleSignIn={googleSignIn}
          />
        ) : (
          <RoleSelection
            onSelectRole={(role) => {
              setSelectedRole(role);
              setStep(2);
            }}
          />
        )}
      </View>
    </AuthScreen>
  );
}

type RoleSelectionProps = Readonly<{
  onSelectRole: (role: RegisterRole) => void;
}>;

function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <>
      <Text style={styles.subtitle}>Bạn muốn đăng ký tài khoản nào?</Text>

      <View style={styles.roleOptions}>
        <RoleCard
          icon="person"
          title="Tôi là Khách hàng"
          description="Tìm kiếm và đặt dịch vụ thợ nghề đáng tin cậy."
          benefits={['Đặt dịch vụ nhanh chóng', 'Theo dõi đơn hàng', 'Đánh giá thợ sau dịch vụ']}
          onPress={() => onSelectRole('customer')}
        />
        <RoleCard
          icon="engineering"
          title="Tôi là Thợ nghề"
          description="Nhận đơn phù hợp khu vực và quản lý thu nhập minh bạch."
          benefits={['Nhận đơn linh hoạt', 'Quản lý lịch làm việc', 'Xây dựng uy tín nghề']}
          onPress={() => onSelectRole('worker')}
        />
      </View>

      <LoginLink />
    </>
  );
}

type RoleCardProps = Readonly<{
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  description: string;
  benefits: string[];
  onPress: () => void;
}>;

function RoleCard({ icon, title, description, benefits, onPress }: RoleCardProps) {
  return (
    <Pressable style={styles.roleCard} onPress={onPress}>
      <View style={styles.roleIcon}>
        <MaterialIcons name={icon} size={30} color="#FF8228" />
      </View>
      <View style={styles.roleCopy}>
        <Text style={styles.roleTitle}>{title}</Text>
        <Text style={styles.roleDescription}>{description}</Text>
        <View style={styles.roleBenefits}>
          {benefits.map((benefit) => (
            <View key={benefit} style={styles.roleBenefitRow}>
              <MaterialIcons name="check-circle-outline" size={20} color="#818A91" />
              <Text style={styles.roleBenefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#574237" />
    </Pressable>
  );
}

type RegisterFormProps = Readonly<{
  selectedRole: RegisterRole;
  step: number;
  setStep: (step: number) => void;
  fullName: string;
  target: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
  isOtpSent: boolean;
  isOtpVerified: boolean;
  sendingOtp: boolean;
  verifyingOtp: boolean;
  otpDigits: string[];
  cooldown: number;
  errors: FieldErrors;
  apiError: string;
  otpError: string;
  loading: boolean;
  otpInputs: React.RefObject<(TextInput | null)[]>;
  onChangeRole: () => void;
  onChangeFullName: (value: string) => void;
  onChangeTarget: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onToggleTerms: () => void;
  onSendOtp: () => void;
  onSetDigit: (index: number, value: string) => void;
  onSubmit: () => void;
  onGoogleSignIn: () => void;
}>;

function RegisterForm({
  selectedRole,
  step,
  setStep,
  fullName,
  target,
  password,
  confirmPassword,
  acceptedTerms,
  isOtpSent,
  isOtpVerified,
  sendingOtp,
  verifyingOtp,
  otpDigits,
  cooldown,
  errors,
  apiError,
  otpError,
  loading,
  otpInputs,
  onChangeRole,
  onChangeFullName,
  onChangeTarget,
  onChangePassword,
  onChangeConfirmPassword,
  onToggleTerms,
  onSendOtp,
  onSetDigit,
  onSubmit,
  onGoogleSignIn,
}: RegisterFormProps) {
  const isWorker = selectedRole === 'worker';

  return (
    <>
      {/* Step Indicator */}
      <View style={styles.wizardIndicator}>
        <View style={styles.wizardIndicatorLineContainer}>
          <View style={[styles.wizardIndicatorLine, step >= 2 && styles.wizardIndicatorLineActive]} />
          <View style={[styles.wizardIndicatorLine, step >= 3 && styles.wizardIndicatorLineActive]} />
        </View>
        <View style={styles.wizardStepsRow}>
          <View style={styles.wizardStepCol}>
            <View style={[
              styles.wizardStepCircle,
              step >= 1 && styles.wizardStepCircleActive,
              step > 1 && styles.wizardStepCircleCompleted
            ]}>
              {step > 1 ? (
                <MaterialIcons name="check" size={14} color="#ffffff" />
              ) : (
                <Text style={[styles.wizardStepNumber, step >= 1 && styles.wizardStepNumberActive]}>1</Text>
              )}
            </View>
            <Text style={[styles.wizardStepLabel, step >= 1 && styles.wizardStepLabelActive]}>Vai trò</Text>
          </View>

          <View style={styles.wizardStepCol}>
            <View style={[
              styles.wizardStepCircle,
              step >= 2 && styles.wizardStepCircleActive,
              step > 2 && styles.wizardStepCircleCompleted
            ]}>
              {step > 2 ? (
                <MaterialIcons name="check" size={14} color="#ffffff" />
              ) : (
                <Text style={[styles.wizardStepNumber, step >= 2 && styles.wizardStepNumberActive]}>2</Text>
              )}
            </View>
            <Text style={[styles.wizardStepLabel, step >= 2 && styles.wizardStepLabelActive]}>Xác thực</Text>
          </View>

          <View style={styles.wizardStepCol}>
            <View style={[
              styles.wizardStepCircle,
              step >= 3 && styles.wizardStepCircleActive
            ]}>
              <Text style={[styles.wizardStepNumber, step >= 3 && styles.wizardStepNumberActive]}>3</Text>
            </View>
            <Text style={[styles.wizardStepLabel, step >= 3 && styles.wizardStepLabelActive]}>Đăng ký</Text>
          </View>
        </View>
      </View>

      <Text style={styles.subtitle}>
        {isWorker
          ? 'Tạo tài khoản kỹ thuật viên để bắt đầu nhận việc.'
          : 'Tham gia Fixy để đặt dịch vụ dễ dàng.'}
      </Text>

      <View style={styles.selectedRoleBadge}>
        <MaterialIcons name={isWorker ? 'engineering' : 'person'} size={18} color="#FF8228" />
        <Text style={styles.selectedRoleText}>{isWorker ? 'Kỹ thuật viên' : 'Khách hàng'}</Text>
        {step === 2 && !isOtpVerified && (
          <Pressable onPress={onChangeRole}>
            <Text style={styles.changeRoleText}>Đổi</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.form}>
        {/* STEP 2: OTP SEND */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            {/* Email/Phone Input */}
            <View style={styles.targetWrapper}>
              <AuthTextField
                icon="call"
                value={target}
                onChangeText={onChangeTarget}
                placeholder="Số điện thoại hoặc Email"
                keyboardType="default"
                autoCapitalize="none"
                editable={!isOtpVerified}
                error={errors.target}
              />
            </View>

            {/* Send OTP button */}
            <View style={styles.otpActionContainer}>
              <Pressable
                style={[
                  styles.sendOtpBtn,
                  (sendingOtp || !target || cooldown > 0) && styles.sendOtpBtnDisabled,
                ]}
                onPress={onSendOtp}
                disabled={sendingOtp || !target || cooldown > 0}>
                {sendingOtp ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.sendOtpBtnText}>
                    {cooldown > 0 ? `Gửi lại sau (${cooldown}s)` : isOtpSent ? 'Gửi lại mã' : 'Gửi mã OTP'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* STEP 3: REGISTER FORM */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            {/* Locked target info */}
            <View style={styles.lockedTargetContainer}>
              <MaterialIcons name="verified" size={20} color="#059669" />
              <View style={styles.lockedTargetInfo}>
                <Text style={styles.lockedTargetLabel}>Tài khoản đã xác minh</Text>
                <Text style={styles.lockedTargetValue}>{target}</Text>
              </View>
              <Pressable style={styles.changeTargetBtn} onPress={() => setStep(2)}>
                <Text style={styles.changeTargetBtnText}>Thay đổi</Text>
              </Pressable>
            </View>

            <AuthTextField
              icon="person"
              value={fullName}
              onChangeText={onChangeFullName}
              placeholder="Nguyễn Văn An"
              autoCapitalize="words"
              error={errors.fullName}
            />
            <AuthTextField
              icon="lock"
              value={password}
              onChangeText={onChangePassword}
              placeholder="Mật khẩu"
              secureTextEntry
              error={errors.password}
            />
            <AuthTextField
              icon="lock"
              value={confirmPassword}
              onChangeText={onChangeConfirmPassword}
              placeholder="Xác nhận mật khẩu"
              secureTextEntry
              error={errors.confirmPassword}
            />

            <Pressable style={styles.termsRow} onPress={onToggleTerms}>
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms ? <MaterialIcons name="check" size={16} color="#FFFFFF" /> : null}
              </View>
              <Text style={styles.termsText}>
                Tôi đồng ý với <Text style={styles.linkText}>Điều khoản sử dụng</Text> và Chính sách bảo mật.
              </Text>
            </Pressable>
            {errors.acceptedTerms ? <Text style={styles.errorText}>{errors.acceptedTerms}</Text> : null}
            {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

            <View style={styles.actions}>
              <AuthButton label="Đăng ký" loading={loading} onPress={onSubmit} />

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>hoặc</Text>
                <View style={styles.divider} />
              </View>

              <Pressable
                style={styles.googleButton}
                onPress={onGoogleSignIn}>
                <GoogleIcon size={24} />
                <Text style={styles.googleText}>Tiếp tục với Google</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <LoginLink />
    </>
  );
}

function LoginLink() {
  return (
    <View style={styles.bottomLink}>
      <Text style={styles.footerText}>Đã có tài khoản? </Text>
      <Pressable onPress={() => router.replace('/login' as any)}>
        <Text style={styles.linkText}>Đăng nhập</Text>
      </Pressable>
    </View>
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
  subtitle: {
    marginTop: 16,
    color: '#574237',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  roleOptions: {
    gap: 14,
    marginTop: 30,
  },
  roleCard: {
    minHeight: 210,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  roleIcon: {
    height: 54,
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#FFF1E8',
  },
  roleCopy: {
    flex: 1,
    gap: 4,
  },
  roleTitle: {
    color: '#1B1C1C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
  },
  roleDescription: {
    color: '#574237',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  roleBenefits: {
    gap: 10,
    marginTop: 14,
  },
  roleBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBenefitText: {
    flex: 1,
    color: '#574237',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  selectedRoleBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFD3B8',
    backgroundColor: '#FFF7F2',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selectedRoleText: {
    color: '#574237',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  changeRoleText: {
    color: '#FF8228',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
  },
  form: {
    gap: 14,
    marginTop: 22,
  },
  targetWrapper: {
    position: 'relative',
    width: '100%',
  },
  verifiedIndicator: {
    position: 'absolute',
    right: 12,
    top: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  verifiedIndicatorText: {
    color: '#059669',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
  },
  otpActionContainer: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
  sendOtpBtn: {
    backgroundColor: '#FF8228',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  sendOtpBtnDisabled: {
    backgroundColor: '#dec0b1',
  },
  sendOtpBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  otpVerificationBox: {
    backgroundColor: '#FFF7F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD3B8',
    padding: 16,
    marginVertical: 4,
    gap: 12,
  },
  otpSectionTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#574237',
  },
  otpDigitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpDigitInput: {
    flex: 1,
    maxWidth: 44,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF8228',
    backgroundColor: '#FFFFFF',
    color: '#1B1C1C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    textAlign: 'center',
  },
  verifyingSpinner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  verifyingText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#574237',
  },
  otpErrorText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#BA1A1A',
    textAlign: 'center',
  },
  verifiedFieldsBox: {
    gap: 14,
  },
  termsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  checkbox: {
    marginTop: 2,
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: '#ff8228',
    backgroundColor: '#ff8228',
  },
  termsText: {
    flex: 1,
    color: '#574237',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  linkText: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
  },
  errorText: {
    marginTop: 4,
    color: '#BA1A1A',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
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
    marginTop: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDDDDD',
  },
  dividerText: {
    color: '#818A91',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 18,
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
  bottomLink: {
    marginTop: 32,
    paddingTop: 12,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: '#574237',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
  },
  wizardIndicator: {
    paddingHorizontal: 16,
    marginVertical: 16,
    position: 'relative',
    height: 60,
    justifyContent: 'center',
  },
  wizardIndicatorLineContainer: {
    position: 'absolute',
    left: 45,
    right: 45,
    height: 2,
    backgroundColor: '#E5E7EB',
    flexDirection: 'row',
    top: 22,
    zIndex: 1,
  },
  wizardIndicatorLine: {
    flex: 1,
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  wizardIndicatorLineActive: {
    backgroundColor: '#FF8228',
  },
  wizardStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  wizardStepCol: {
    alignItems: 'center',
    width: 60,
  },
  wizardStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  wizardStepCircleActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FF8228',
  },
  wizardStepCircleCompleted: {
    backgroundColor: '#FF8228',
    borderColor: '#FF8228',
  },
  wizardStepNumber: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#9CA3AF',
  },
  wizardStepNumberActive: {
    color: '#FF8228',
  },
  wizardStepLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  wizardStepLabelActive: {
    color: '#FF8228',
    fontFamily: 'Montserrat_600SemiBold',
  },
  stepContainer: {
    width: '100%',
    gap: 16,
  },
  lockedTargetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 12,
  },
  lockedTargetInfo: {
    flex: 1,
  },
  lockedTargetLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    color: '#6B7280',
  },
  lockedTargetValue: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#1F2937',
    marginTop: 2,
  },
  changeTargetBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  changeTargetBtnText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#4B5563',
  },
});
