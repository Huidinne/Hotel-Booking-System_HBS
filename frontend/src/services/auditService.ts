// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT LOG SERVICE
// File: src/services/auditService.ts
// Direct integration with Spring Boot /api/v1/admin/audit-logs
// Based on contract in docs/api/audit-log.md by Duc Anh
// =============================================================================

import { apiClient } from './apiClient';
import {
  AuditActionMeta,
  AuditLogFilterParams,
  AuditLogItem,
  AuditLogPageResponse,
} from '../types/audit';
import {
  AUDIT_ACTIONS_METADATA,
  getMockAuditLogs,
  mockAuditLogs,
} from '../mock/auditMock';

export const auditService = {
  /**
   * Fetch paginated audit logs with search & filters
   * GET /api/v1/admin/audit-logs
   */
  async getAuditLogs(
    filters: AuditLogFilterParams = {},
    page = 0,
    size = 10
  ): Promise<AuditLogPageResponse> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(size));

    if (filters.action) params.set('action', filters.action);
    if (filters.actorEmail) params.set('actorEmail', filters.actorEmail.trim());
    if (filters.targetType) params.set('targetType', filters.targetType.trim());
    if (filters.targetId) params.set('targetId', filters.targetId.trim());
    if (filters.status) params.set('status', filters.status);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);

    try {
      const response = await apiClient.get<AuditLogPageResponse>(
        `/admin/audit-logs?${params.toString()}`
      );
      return response;
    } catch (err: any) {
      // In development or when backend is offline, gracefully fall back to mock data
      if (import.meta.env.DEV) {
        console.warn(
          '[auditService] Backend uncontactable or returned error, using mock data:',
          err?.message
        );
        return getMockAuditLogs(filters, page, size);
      }
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
    } catch (err) {
      return AUDIT_ACTIONS_METADATA;
    }
  },

  /**
   * Get single audit log detail by ID
   * GET /api/v1/admin/audit-logs/{id}
   */
  async getAuditLogById(id: number): Promise<AuditLogItem> {
    try {
      return await apiClient.get<AuditLogItem>(`/admin/audit-logs/${id}`);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        const found = mockAuditLogs.find((item) => item.id === id);
        if (found) return found;
      }
      throw err;
    }
  },
};

