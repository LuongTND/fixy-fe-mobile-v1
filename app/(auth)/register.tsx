import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton } from '@/features/auth/components/auth-button';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { AuthTextField } from '@/features/auth/components/auth-text-field';
import { GoogleIcon } from '@/features/auth/components/google-icon';
import {
  CUSTOMER_ROLE_REGISTER,
  REGISTRATION_OTP_PURPOSE,
  WORKER_ROLE_REGISTER,
} from '@/features/auth/constants';
import { register, sendOtp } from '@/features/auth/services/auth-api';
import { FieldErrors, validateRegisterForm } from '@/features/auth/validation';
import { getApiErrorMessage } from '@/services/api/client';
import { useAuthStore } from '@/store/store';

type RegisterRole = 'customer' | 'worker';

const ROLE_REGISTER_VALUE: Record<RegisterRole, number> = {
  customer: CUSTOMER_ROLE_REGISTER,
  worker: WORKER_ROLE_REGISTER,
};

export default function RegisterScreen() {
  const setPendingOtp = useAuthStore((state) => state.setPendingOtp);
  const [selectedRole, setSelectedRole] = React.useState<RegisterRole | null>(null);
  const [fullName, setFullName] = React.useState('');
  const [target, setTarget] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [acceptedTerms, setAcceptedTerms] = React.useState(true);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [apiError, setApiError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  function goBack() {
    if (!selectedRole) {
      router.back();
      return;
    }

    setSelectedRole(null);
    setErrors({});
    setApiError('');
  }

  async function onSubmit() {
    if (!selectedRole) {
      setApiError('Vui lòng chọn loại tài khoản.');
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
      await sendOtp(validation.values.target, REGISTRATION_OTP_PURPOSE);
      setPendingOtp(validation.values.target, REGISTRATION_OTP_PURPOSE);
      router.push('/otp' as any);
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
            fullName={fullName}
            target={target}
            password={password}
            confirmPassword={confirmPassword}
            acceptedTerms={acceptedTerms}
            errors={errors}
            apiError={apiError}
            loading={loading}
            onChangeRole={() => {
              setSelectedRole(null);
              setErrors({});
              setApiError('');
            }}
            onChangeFullName={setFullName}
            onChangeTarget={setTarget}
            onChangePassword={setPassword}
            onChangeConfirmPassword={setConfirmPassword}
            onToggleTerms={() => setAcceptedTerms((value) => !value)}
            onSubmit={onSubmit}
          />
        ) : (
          <RoleSelection onSelectRole={setSelectedRole} />
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
          benefits={[
            'Đặt dịch vụ nhanh chóng',
            'Theo dõi đơn hàng',
            'Đánh giá thợ sau dịch vụ',
          ]}
          onPress={() => onSelectRole('customer')}
        />
        <RoleCard
          icon="engineering"
          title="Tôi là Thợ nghề"
          description="Nhận đơn phù hợp khu vực và quản lý thu nhập minh bạch."
          benefits={[
            'Nhận đơn linh hoạt',
            'Quản lý lịch làm việc',
            'Xây dựng uy tín nghề',
          ]}
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
  fullName: string;
  target: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
  errors: FieldErrors;
  apiError: string;
  loading: boolean;
  onChangeRole: () => void;
  onChangeFullName: (value: string) => void;
  onChangeTarget: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onToggleTerms: () => void;
  onSubmit: () => void;
}>;

function RegisterForm({
  selectedRole,
  fullName,
  target,
  password,
  confirmPassword,
  acceptedTerms,
  errors,
  apiError,
  loading,
  onChangeRole,
  onChangeFullName,
  onChangeTarget,
  onChangePassword,
  onChangeConfirmPassword,
  onToggleTerms,
  onSubmit,
}: RegisterFormProps) {
  const isWorker = selectedRole === 'worker';

  return (
    <>
      <Text style={styles.subtitle}>
        {isWorker
          ? 'Tạo tài khoản kỹ thuật viên để bắt đầu nhận việc.'
          : 'Tham gia Fixy để đặt dịch vụ dễ dàng.'}
      </Text>

      <View style={styles.selectedRoleBadge}>
        <MaterialIcons name={isWorker ? 'engineering' : 'person'} size={18} color="#FF8228" />
        <Text style={styles.selectedRoleText}>{isWorker ? 'Kỹ thuật viên' : 'Khách hàng'}</Text>
        <Pressable onPress={onChangeRole}>
          <Text style={styles.changeRoleText}>Đổi</Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        <AuthTextField
          icon="person"
          value={fullName}
          onChangeText={onChangeFullName}
          placeholder="Nguyễn Văn An"
          autoCapitalize="words"
          error={errors.fullName}
        />
        <AuthTextField
          icon="call"
          value={target}
          onChangeText={onChangeTarget}
          placeholder="0912 345 678"
          keyboardType="phone-pad"
          error={errors.target}
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
      </View>

      <Pressable style={styles.termsRow} onPress={onToggleTerms}>
        <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
          {acceptedTerms ? <MaterialIcons name="check" size={16} color="#FFFFFF" /> : null}
        </View>
        <Text style={styles.termsText}>
          Tôi đồng ý với <Text style={styles.linkText}>Điều khoản sử dụng</Text> và Chính sách bảo
          mật.
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
          onPress={() => Alert.alert('Đăng nhập Google', 'Tính năng đang được phát triển.')}>
          <GoogleIcon size={24} />
          <Text style={styles.googleText}>Tiếp tục với Google</Text>
        </Pressable>
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
  termsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
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
    marginTop: 34,
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
});
