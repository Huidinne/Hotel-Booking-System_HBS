// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT LOG TYPES
// File: src/types/audit.ts
// Contract: [SP2-1104-ANH] docs/api/audit-log.md
// =============================================================================

export type AuditActionType =
  | 'CHECK_IN_ASSIGN_ROOM'
  | 'CHECK_OUT_SETTLEMENT'
  | 'CANCEL_BOOKING'
  | 'CONFIRM_BOOKING'
  | 'CONFIRM_REFUND'
  | 'CHANGE_ROOM_STATUS'
  | 'UPDATE_PRICE'
  | 'CREATE_BOOKING'
  | 'MARK_NO_SHOW'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED';

export interface AuditActionMeta {
  name: AuditActionType;
  description: string;
}

export interface AuditLogItem {
  id: number;
  actorId?: number | null;
  actorEmail: string;
  actorRole: 'ROLE_ADMIN' | 'ROLE_RECEPTIONIST' | 'ROLE_CUSTOMER' | 'SYSTEM' | string;
  action: AuditActionType | string;
  actionDescription?: string | null;
  targetType: 'BOOKING' | 'ROOM' | 'ROOM_TYPE' | 'PAYMENT' | 'USER' | string;
  targetId?: string | null;
  description?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status: 'SUCCESS' | 'FAILED' | string;
  errorMessage?: string | null;
  createdAt: string; // ISO string '2026-11-04T15:30:00'
}

export interface AuditLogFilterParams {
  startDate?: string;
  endDate?: string;
  action?: string;
  actorEmail?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  status?: string;
  page?: number;
  size?: number;
}

export interface AuditLogPageResponse {
  content: AuditLogItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

