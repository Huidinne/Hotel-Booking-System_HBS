// =============================================================================
// HOTEL BOOKING SYSTEM - ADMIN USER MANAGEMENT SERVICE
// File: src/services/userService.ts
// Direct integration with Spring Boot /api/v1/admin/users
// =============================================================================

import { apiClient } from './apiClient';

export type UserRole = 'ROLE_ADMIN' | 'ROLE_RECEPTIONIST' | 'ROLE_CUSTOMER';

export interface AdminUserItem {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserPageResponse {
  content: AdminUserItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface AdminUserStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  adminCount: number;
  receptionistCount: number;
  customerCount: number;
}

export interface AdminUserFilterParams {
  keyword?: string;
  role?: string;
  isActive?: string;
  page?: number;
  size?: number;
}

export interface AdminUserCreatePayload {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: UserRole;
}

export interface AdminUserUpdatePayload {
  fullName: string;
  phone: string;
  role: UserRole;
}

export const userService = {
  /**
   * GET /api/v1/admin/users
   */
  async getUsers(filters: AdminUserFilterParams = {}): Promise<AdminUserPageResponse> {
    const params = new URLSearchParams();
    params.set('page', String(Math.max(0, filters.page ?? 0)));
    params.set('size', String(Math.min(100, Math.max(1, filters.size ?? 10))));

    if (filters.keyword && filters.keyword.trim() !== '') {
      params.set('keyword', filters.keyword.trim());
    }
    if (filters.role && filters.role !== 'ALL') {
      params.set('role', filters.role);
    }
    if (filters.isActive === 'ACTIVE') {
      params.set('isActive', 'true');
    } else if (filters.isActive === 'LOCKED') {
      params.set('isActive', 'false');
    }

    return await apiClient.get<AdminUserPageResponse>(`/admin/users?${params.toString()}`);
  },

  /**
   * GET /api/v1/admin/users/stats
   */
  async getStats(): Promise<AdminUserStats> {
    return await apiClient.get<AdminUserStats>('/admin/users/stats');
  },

  /**
   * POST /api/v1/admin/users
   */
  async createUser(payload: AdminUserCreatePayload): Promise<AdminUserItem> {
    return await apiClient.post<AdminUserItem>('/admin/users', payload);
  },

  /**
   * PUT /api/v1/admin/users/{id}
   */
  async updateUser(id: number, payload: AdminUserUpdatePayload): Promise<AdminUserItem> {
    return await apiClient.put<AdminUserItem>(`/admin/users/${id}`, payload);
  },

  /**
   * PATCH /api/v1/admin/users/{id}/status
   */
  async updateUserStatus(id: number, isActive: boolean): Promise<AdminUserItem> {
    return await apiClient.patch<AdminUserItem>(`/admin/users/${id}/status`, { isActive });
  },

  /**
   * POST /api/v1/admin/users/{id}/reset-password
   */
  async resetPassword(id: number, newPassword: string): Promise<AdminUserItem> {
    return await apiClient.post<AdminUserItem>(`/admin/users/${id}/reset-password`, { newPassword });
  },
};
