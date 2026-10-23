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
      return this.getCurrentUser();
    }
  },

  /**
   * Synchronously get cached user from localStorage
   */
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
};
