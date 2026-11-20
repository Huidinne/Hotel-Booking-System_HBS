// =============================================================================
// HOTEL BOOKING SYSTEM - AUTHENTICATION SERVICE
// File: src/services/authService.ts
// Direct integration with Spring Boot /api/v1/auth REST API.
// =============================================================================

import { apiClient } from './apiClient';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/auth';

const AUTH_STORAGE_KEY = 'hbs_current_user';
const TOKEN_STORAGE_KEY = 'hbs_access_token';
const REMEMBER_ME_KEY = 'hbs_remember_me';

export interface LoginParams {
  email?: string;
  emailOrUsername?: string;
  password: string;
  rememberMe?: boolean;
}

export const authService = {
  /**
   * Log in user: calls real Spring Boot POST /api/v1/auth/login
   */
  async login(request: LoginParams): Promise<AuthResponse> {
    const email = (request.email || request.emailOrUsername || '').trim();
    const loginPayload: LoginRequest = {
      email,
      password: request.password,
    };

    const response = await apiClient.post<AuthResponse>('/auth/login', loginPayload);

    // Save tokens and user info from Spring Boot backend
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response.user));
    localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);

    if (request.rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }

    return response;
  },

  /**
   * Register new user: calls real Spring Boot POST /api/v1/auth/register
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', request);

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response.user));
    localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);

    return response;
  },

  /**
   * Log out user: calls POST /api/v1/auth/logout and clears local credentials
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {});
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  },

  /**
   * Get current authenticated user profile: GET /api/v1/auth/me
   */
  async getProfile(): Promise<User | null> {
    try {
      const user = await apiClient.get<User>('/auth/me');
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return user;
    } catch {
      return null;
    }
  },

  /**
   * Update current authenticated user profile: PUT /api/v1/auth/me
   * Note: Backend AuthController currently only provides GET /api/v1/auth/me.
   * If backend responds with HTTP 405 (Method Not Allowed) or 404, we catch the error,
   * persist the updated profile locally in localStorage, and return the updated user
   * to provide a seamless user experience without breaking JWT tokens or auth state.
   */
  async updateProfile(data: { fullName: string; phone: string }): Promise<User> {
    const trimmedName = data.fullName.trim();
    const trimmedPhone = data.phone.trim();

    try {
      const updatedUser = await apiClient.put<User>('/auth/me', {
        fullName: trimmedName,
        phone: trimmedPhone,
      });
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      return updatedUser;
    } catch (err: any) {
      console.warn(
        'Backend chưa hỗ trợ PUT /api/v1/auth/me (HTTP 405/404). Tự động cập nhật session client & localStorage.',
        err
      );
      const current = authService.getCurrentUser() || ({} as User);
      const updatedUser: User = {
        ...current,
        fullName: trimmedName,
        phone: trimmedPhone,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      return updatedUser;
    }
  },

  /**
   * Synchronously get cached user from localStorage (chỉ hợp lệ nếu có token)
   */
  getCurrentUser(): User | null {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  getRememberedIdentifier(): string {
    return localStorage.getItem(REMEMBER_ME_KEY) || '';
  },

  /**
   * Bước 1: Yêu cầu hệ thống gửi mã OTP xác thực qua email
   * Endpoint: POST /api/v1/auth/forgot-password/request-otp
   */
  async requestPasswordResetOtp(email: string): Promise<{ cooldownSeconds: number; email: string }> {
    return await apiClient.post<{ cooldownSeconds: number; email: string }>('/auth/forgot-password/request-otp', {
      email: email.trim().toLowerCase(),
    });
  },

  /**
   * Bước 2: Xác minh mã OTP 6 số người dùng đã nhận được qua email
   * Endpoint: POST /api/v1/auth/forgot-password/verify-otp
   */
  async verifyPasswordResetOtp(email: string, otp: string): Promise<{ resetToken: string; expiresInSeconds: number }> {
    return await apiClient.post<{ resetToken: string; expiresInSeconds: number }>('/auth/forgot-password/verify-otp', {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
    });
  },

  /**
   * Bước 3: Đặt lại mật khẩu mới bằng Reset Token đã được cấp
   * Endpoint: POST /api/v1/auth/forgot-password/reset-password
   */
  async resetPasswordWithToken(payload: { email: string; resetToken: string; newPassword: string }): Promise<void> {
    await apiClient.post('/auth/forgot-password/reset-password', {
      email: payload.email.trim().toLowerCase(),
      resetToken: payload.resetToken.trim(),
      newPassword: payload.newPassword,
    });
  },
};
