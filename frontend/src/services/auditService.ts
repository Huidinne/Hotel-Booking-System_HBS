// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT LOG SERVICE
// File: src/services/auditService.ts
// Direct integration with Spring Boot /api/v1/admin/audit-logs
// Real API integration - strictly preserves backend errors (401, 403, network)
// =============================================================================

import { apiClient } from './apiClient';
import {
  AuditActionMeta,
  AuditLogFilterParams,
  AuditLogItem,
  AuditLogPageResponse,
} from '../types/audit';
import { AUDIT_ACTIONS_METADATA } from '../mock/auditMock';

export const auditService = {
  /**
   * Fetch paginated audit logs with search & filters directly from backend
   * GET /api/v1/admin/audit-logs
   */
  async getAuditLogs(
    filters: AuditLogFilterParams = {},
    page = 0,
    size = 10,
    options?: { signal?: AbortSignal }
  ): Promise<AuditLogPageResponse> {
    const params = new URLSearchParams();
    params.set('page', String(Math.max(0, page)));
    params.set('size', String(Math.min(100, Math.max(1, size))));

    if (filters.action && filters.action.trim() !== '') {
      params.set('action', filters.action.trim());
    }
    // Support both actorEmail and userEmail as accepted by backend AuditLogFilterRequest
    if (filters.actorEmail && filters.actorEmail.trim() !== '') {
      params.set('userEmail', filters.actorEmail.trim());
      params.set('actorEmail', filters.actorEmail.trim());
    }
    if (filters.targetType && filters.targetType.trim() !== '') {
      params.set('targetType', filters.targetType.trim());
    }
    if (filters.targetId && filters.targetId.trim() !== '') {
      params.set('targetId', filters.targetId.trim());
    }
    if (filters.status && filters.status.trim() !== '') {
      params.set('status', filters.status.trim());
    }
    if (filters.startDate && filters.startDate.trim() !== '') {
      params.set('startDate', filters.startDate.split('T')[0]);
    }
    if (filters.endDate && filters.endDate.trim() !== '') {
      params.set('endDate', filters.endDate.split('T')[0]);
    }

    try {
      const response = await apiClient.get<AuditLogPageResponse>(
        `/admin/audit-logs?${params.toString()}`,
        { signal: options?.signal }
      );
      return response;
    } catch (err: any) {
      // Re-throw so caller page displays true backend status (401, 403, 500, or network error)
      // Never substitute mock data when the real API fails or returns error
      throw err;
    }
  },

  /**
   * Get list of supported audit actions for filter dropdown
   * GET /api/v1/admin/audit-logs/actions
   */
  async getAuditActions(): Promise<AuditActionMeta[]> {
    try {
      const response = await apiClient.get<AuditActionMeta[]>(
        '/admin/audit-logs/actions'
      );
      if (Array.isArray(response) && response.length > 0) {
        return response;
      }
      return AUDIT_ACTIONS_METADATA;
    } catch {
      return AUDIT_ACTIONS_METADATA;
    }
  },

  /**
   * Get single audit log detail by ID
   * GET /api/v1/admin/audit-logs/{id}
   */
  async getAuditLogById(id: number): Promise<AuditLogItem> {
    return await apiClient.get<AuditLogItem>(`/admin/audit-logs/${id}`);
  },
};
