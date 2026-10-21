// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - AUTHENTICATION & USER TYPES
// File: src/types/auth.ts
// =============================================================================

export type UserRole = 'ROLE_CUSTOMER' | 'ROLE_RECEPTIONIST' | 'ROLE_ADMIN';

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  isActive?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // in seconds, e.g. 900
  user: User;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}
