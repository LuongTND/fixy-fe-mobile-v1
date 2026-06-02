export type FieldErrors = Record<string, string | undefined>;

type InvalidResult = {
  valid: false;
  errors: FieldErrors;
};

type ValidResult<TValues> = {
  valid: true;
  errors: FieldErrors;
  values: TValues;
};

export type ValidationResult<TValues> = InvalidResult | ValidResult<TValues>;

export type RegisterFormInput = {
  fullName: string;
  target: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

export type LoginFormInput = {
  target: string;
  password: string;
};

export type ForgotPasswordFormInput = {
  target: string;
};

export type ResetPasswordFormInput = {
  password: string;
  confirmPassword: string;
};

export function validateRegisterForm(
  input: RegisterFormInput
): ValidationResult<{ fullName: string; target: string; password: string }> {
  const errors: FieldErrors = {};
  const fullName = input.fullName.trim();
  const target = input.target.trim();

  if (!fullName) errors.fullName = 'Vui lòng nhập họ và tên.';
  if (!target) errors.target = 'Vui lòng nhập số điện thoại.';
  if (input.password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
  if (input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
  }
  if (!input.acceptedTerms) errors.acceptedTerms = 'Bạn cần đồng ý với điều khoản sử dụng.';

  if (hasErrors(errors)) return { valid: false, errors };

  return {
    valid: true,
    errors,
    values: { fullName, target, password: input.password },
  };
}

export function validateLoginForm(
  input: LoginFormInput
): ValidationResult<{ target: string; password: string }> {
  const errors: FieldErrors = {};
  const target = input.target.trim();

  if (!target) errors.target = 'Vui lòng nhập email hoặc số điện thoại.';
  if (!input.password) errors.password = 'Vui lòng nhập mật khẩu.';

  if (hasErrors(errors)) return { valid: false, errors };

  return { valid: true, errors, values: { target, password: input.password } };
}

export function validateForgotPasswordForm(
  input: ForgotPasswordFormInput
): ValidationResult<{ target: string }> {
  const errors: FieldErrors = {};
  const target = input.target.trim();

  if (!target) errors.target = 'Vui lòng nhập email hoặc số điện thoại.';

  if (hasErrors(errors)) return { valid: false, errors };

  return { valid: true, errors, values: { target } };
}

export function validateResetPasswordForm(
  input: ResetPasswordFormInput
): ValidationResult<{ password: string }> {
  const errors: FieldErrors = {};

  if (input.password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
  if (input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
  }

  if (hasErrors(errors)) return { valid: false, errors };

  return { valid: true, errors, values: { password: input.password } };
}

export function validateOtpForm(digits: string[]): ValidationResult<{ otpCode: string }> {
  const otpCode = getOtpCode(digits);
  const errors: FieldErrors = {};

  if (!/^\d{6}$/.test(otpCode)) errors.otpCode = 'Vui lòng nhập mã OTP gồm 6 chữ số.';

  if (hasErrors(errors)) return { valid: false, errors };

  return { valid: true, errors, values: { otpCode } };
}

export function getOtpCode(digits: string[]) {
  return digits.join('');
}

function hasErrors(errors: FieldErrors) {
  return Object.values(errors).some(Boolean);
}
