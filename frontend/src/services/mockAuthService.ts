// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - MOCK AUTHENTICATION SERVICE
// File: src/services/mockAuthService.ts
// Phase: Mock authentication only (No real backend JWT required)
// =============================================================================

import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/auth';
import { MOCK_USERS } from '../mock/authMock';

const AUTH_STORAGE_KEY = 'hbs_current_user';
const TOKEN_STORAGE_KEY = 'hbs_access_token';
const REMEMBER_ME_KEY = 'hbs_remember_me';

// In-memory / persistent mock user profile repository
let registeredUsers: User[] = [...MOCK_USERS];

export interface MockLoginRequest extends LoginRequest {
  emailOrUsername?: string;
  rememberMe?: boolean;
}

export const mockAuthService = {
  // TODO: Replace mock implementation with real backend API when available: POST /api/v1/auth/login
  async login(request: MockLoginRequest): Promise<AuthResponse> {
    await new Promise((res) => setTimeout(res, 300));

    const identifier = (request.emailOrUsername || request.email || '').trim().toLowerCase();

    // Match by email or username (name before @)
    const user = registeredUsers.find(
      (u) =>
        u.email.toLowerCase() === identifier ||
        u.email.toLowerCase().split('@')[0] === identifier ||
        u.fullName.toLowerCase() === identifier
    );

    if (!user) {
      throw new Error('Email/Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    // Default password for demo accounts is 'Password@123', or any password >= 6 characters for newly registered users
    if (request.password !== 'Password@123' && request.password.length < 6) {
      throw new Error('Mật khẩu không hợp lệ');
    }

    const authResponse: AuthResponse = {
      accessToken: `mock-jwt-token-${user.id}-${Date.now()}`,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 mins
      user,
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_STORAGE_KEY, authResponse.accessToken);

    if (request.rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, identifier);
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }

    return authResponse;
  },

  // TODO: Replace mock implementation with real backend API when available: POST /api/v1/auth/register
  async register(request: RegisterRequest): Promise<AuthResponse> {
    await new Promise((res) => setTimeout(res, 350));

    const existing = registeredUsers.find(
      (u) => u.email.toLowerCase() === request.email.trim().toLowerCase()
    );

    if (existing) {
      throw new Error('Email này đã được đăng ký trong hệ thống');
    }

    const newUser: User = {
      id: Date.now(),
      email: request.email.trim(),
      fullName: request.fullName.trim(),
      phone: request.phone.trim(),
      role: 'ROLE_CUSTOMER',
      isActive: true,
    };

    registeredUsers.push(newUser);

    const authResponse: AuthResponse = {
      accessToken: `mock-jwt-token-${newUser.id}-${Date.now()}`,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: newUser,
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    localStorage.setItem(TOKEN_STORAGE_KEY, authResponse.accessToken);

    return authResponse;
  },

  // TODO: Replace mock implementation with real backend API when available: POST /api/v1/auth/logout
  async logout(): Promise<void> {
    await new Promise((res) => setTimeout(res, 150));
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  },

  // Mock Forgot Password flow
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    await new Promise((res) => setTimeout(res, 350));
    const trimmed = email.trim().toLowerCase();
    const user = registeredUsers.find((u) => u.email.toLowerCase() === trimmed);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản với email này trong hệ thống.');
    }
    return {
      success: true,
      message: `Hướng dẫn đặt lại mật khẩu đã được gửi tới email ${email} (Mô phỏng). Mật khẩu tạm thời là 'Password@123'.`,
    };
  },

  // Get current active user (null if guest visitor)
  getCurrentUser(): User | null {
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

  // Mock utility to switch accounts quickly for demo/testing
  switchUser(user: User): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_STORAGE_KEY, `mock-jwt-token-${user.id}-${Date.now()}`);
  },

  getDemoUsers(): User[] {
    return registeredUsers;
  },
};
