export const AUTH_ENDPOINTS = {
  register: '/auth/register',
  otpSend: '/auth/otp/send',
  otpVerify: '/auth/otp/verify',
  login: '/auth/login',
  loginGoogle: '/auth/login/google',
  refreshToken: '/auth/token/refresh',
  changePassword: '/auth/password/change',
  resetPassword: '/auth/reset-password',
  forgotPassword: '/auth/forgot-password',
} as const;

export function buildGoogleLoginBody(credential: string) {
  return { credential };
}

export type RegisterBody = {
  fullName: string;
  password: string;
  target: string;
  roleRegister: number;
};

export function buildRegisterBody(input: RegisterBody): RegisterBody {
  return {
    fullName: input.fullName,
    password: input.password,
    target: input.target,
    roleRegister: input.roleRegister,
  };
}

export function buildOtpSendBody(target: string, purpose: number) {
  return { target, purpose };
}

export function buildOtpVerifyBody(target: string, otpCode: string) {
  return { target, otpCode };
}

export function buildLoginBody(target: string, password: string) {
  return { target, password };
}

export function buildRefreshTokenBody(refreshToken: string) {
  return { refreshToken };
}

export function buildChangePasswordBody(target: string, oldPassword: string, newPassword: string) {
  return { target, oldPassword, newPassword };
}

export function buildResetPasswordBody(target: string, newPassword: string) {
  return { target, newPassword };
}

export function buildForgotPasswordBody(target: string) {
  return { target };
}
