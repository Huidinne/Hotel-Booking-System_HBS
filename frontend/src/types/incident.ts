// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - ROOM INCIDENT / MAINTENANCE TYPES (SPRINT 4)
// File: src/types/incident.ts
// Direct mapping with Spring Boot Backend DTOs (org.example.backend.roomservice)
// =============================================================================

export type IncidentPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'MEDIUM' | 'CRITICAL';

export const INCIDENT_PRIORITIES: { key: IncidentPriority; label: string; color: string }[] = [
  { key: 'LOW', label: 'Thấp (Low)', color: '#64748B' },
  { key: 'NORMAL', label: 'Bình thường (Normal)', color: '#0284C7' },
  { key: 'HIGH', label: 'Cao (High)', color: '#D97706' },
  { key: 'URGENT', label: 'Khẩn cấp (Urgent)', color: '#DC2626' },
];

export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED' | 'REPORTED' | 'CLOSED';

export const INCIDENT_STATUSES: { key: IncidentStatus; label: string }[] = [
  { key: 'OPEN', label: 'Tiếp nhận mới (Open)' },
  { key: 'IN_PROGRESS', label: 'Đang xử lý (In Progress)' },
  { key: 'RESOLVED', label: 'Đã hoàn thành (Resolved)' },
  { key: 'CANCELLED', label: 'Đã hủy (Cancelled)' },
];

export interface Incident {
  id: number;
  requestCode: string; // MR-YYYYMMDD-XXXX
  incidentCode?: string; // Alias for UI compatibility
  bookingId: number;
  bookingRoomId: number;
  roomId: number;
  roomNumber?: string;
  description: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  blocksResale: boolean;
  resolutionNote?: string;
  cancelReason?: string;
  resolvedAt?: string;
  createdBy?: string;
  resolvedBy?: string;
  version: number;
  createdAt: string;
  updatedAt?: string;

  // Legacy/UI aliases for existing components
  title?: string;
  category?: string;
  assignedTo?: string;
  reportedBy?: string;
}

export interface CreateIncidentRequest {
  bookingId: number;
  bookingRoomId: number;
  roomId?: number;
  roomNumber?: string;
  description: string;
  priority: IncidentPriority;
  blocksResale: boolean;

  // UI optional fields
  category?: string;
  title?: string;
  customerName?: string;
  imageUrl?: string;
}

export interface UpdateIncidentRequest {
  id?: number;
  status: IncidentStatus;
  version: number;
  blocksResale?: boolean;
  resolutionNote?: string;
  reason?: string;

  // UI optional fields
  priority?: IncidentPriority;
  category?: string;
  assignedTo?: string;
}
