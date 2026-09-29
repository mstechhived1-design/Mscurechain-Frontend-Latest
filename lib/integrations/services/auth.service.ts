import { endpoints } from '../config';
import { AUTH_ENDPOINTS } from '../config/endpoints';
import { apiClient } from '../api';
import type {
  LoginRequest,
  RegisterRequest,
  OtpRequest,
  VerifyOtpRequest,
  AuthResponse,
  MeResponse
} from '../types';

export const authService = {
  // Client-side
  loginClient: (data: LoginRequest) =>
    apiClient<AuthResponse>(endpoints.auth.login, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Role-specific login endpoints (server enforces role)
  loginNurse: (data: LoginRequest) =>
    apiClient<AuthResponse>(AUTH_ENDPOINTS.NURSE_LOGIN, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  loginLab: (data: LoginRequest) =>
    apiClient<AuthResponse>(AUTH_ENDPOINTS.LAB_LOGIN, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  loginPharmacy: (data: LoginRequest) =>
    apiClient<AuthResponse>(AUTH_ENDPOINTS.PHARMACY_LOGIN, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  registerClient: (data: RegisterRequest) =>
    apiClient<AuthResponse>(endpoints.auth.register, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendOtpClient: (data: OtpRequest) =>
    apiClient<{ message: string }>(endpoints.auth.sendOtp, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyOtpClient: (data: VerifyOtpRequest) =>
    apiClient<{ message: string }>(endpoints.auth.verifyOtp, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refreshClient: () =>
    apiClient<{ accessToken: string; csrfToken: string }>(endpoints.auth.refresh, {
      method: "POST",
    }),

  logoutClient: () =>
    apiClient<{ success: boolean }>(endpoints.auth.logout, {
      method: "POST",
    }),

  getMeClient: (options?: any) =>
    apiClient<MeResponse>(endpoints.auth.me, options),
};
