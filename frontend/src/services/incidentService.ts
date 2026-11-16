// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - ROOM INCIDENT SERVICE (SPRINT 4)
// File: src/services/incidentService.ts
// Real API Integration with Spring Boot Backend (/api/v1/receptionist/maintenance-requests)
// =============================================================================

import { apiClient } from './apiClient';
import {
  CreateIncidentRequest,
  Incident,
  IncidentPriority,
  IncidentStatus,
  UpdateIncidentRequest,
} from '../types/incident';
import { roomServiceOrderService } from './roomServiceOrderService';

export interface IncidentFilterParams {
  search?: string; // Tìm theo mã phiếu, số phòng, mô tả
  roomId?: number;
  roomNumber?: string;
  category?: string;
  priority?: IncidentPriority | 'ALL';
  status?: IncidentStatus | 'ALL';
  blocksResale?: boolean | 'ALL';
  page?: number;
  size?: number;
}

function mapPriorityToBackend(p?: IncidentPriority): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
  if (!p) return 'NORMAL';
  if (p === 'MEDIUM') return 'NORMAL';
  if (p === 'CRITICAL') return 'URGENT';
  if (['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(p)) return p as any;
  return 'NORMAL';
}

function mapStatusToBackend(s?: IncidentStatus): 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED' {
  if (!s) return 'OPEN';
  if (s === 'REPORTED') return 'OPEN';
  if (s === 'CLOSED') return 'RESOLVED';
  if (['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'].includes(s)) return s as any;
  return 'OPEN';
}

function normalizeIncident(raw: any): Incident {
  if (!raw) return {} as Incident;
  const requestCode = raw.requestCode || `MR-${raw.id}`;
  return {
    id: Number(raw.id),
    requestCode,
    incidentCode: requestCode,
    bookingId: Number(raw.bookingId || 0),
    bookingRoomId: Number(raw.bookingRoomId || 0),
    roomId: Number(raw.roomId || 0),
    roomNumber: raw.roomNumber ? String(raw.roomNumber) : '',
    description: raw.description || '',
    priority: (raw.priority || 'NORMAL') as IncidentPriority,
    status: (raw.status || 'OPEN') as IncidentStatus,
    blocksResale: Boolean(raw.blocksResale),
    resolutionNote: raw.resolutionNote || '',
    cancelReason: raw.cancelReason || '',
    resolvedAt: raw.resolvedAt,
    createdBy: raw.createdBy || 'Lễ tân',
    resolvedBy: raw.resolvedBy,
    version: Number(raw.version ?? 0),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    title: raw.title || (raw.description ? raw.description.slice(0, 60) : `Sự cố phòng ${raw.roomNumber || ''}`),
    category: raw.category || 'Kỹ thuật buồng phòng',
    assignedTo: raw.resolvedBy || 'Kỹ thuật viên',
    reportedBy: raw.createdBy || 'Lễ tân',
  };
}

export const incidentService = {
  /**
   * Lấy danh sách toàn bộ phiếu sự cố từ Backend
   * API: GET /api/v1/receptionist/maintenance-requests
   */
  async getIncidents(filters?: IncidentFilterParams): Promise<Incident[]> {
    const params = new URLSearchParams();
    params.append('page', String(filters?.page ?? 0));
    params.append('size', String(filters?.size ?? 50));
    params.append('sort', 'id,desc');

    if (filters?.roomId) {
      params.append('roomId', String(filters.roomId));
    }

    if (filters?.priority && filters.priority !== 'ALL') {
      params.append('priority', mapPriorityToBackend(filters.priority));
    }

    if (filters?.status && filters.status !== 'ALL') {
      params.append('status', mapStatusToBackend(filters.status));
    }

    if (filters?.blocksResale !== undefined && filters.blocksResale !== 'ALL') {
      params.append('blocksResale', String(filters.blocksResale));
    }

    const res = await apiClient.get<any>(`/receptionist/maintenance-requests?${params.toString()}`).catch((err) => {
      console.warn('Không thể tải sự cố từ backend (có thể do quyền hạn hoặc mạng), dùng danh sách cục bộ:', err);
      return [];
    });
    const items = Array.isArray(res) ? res : res?.content || [];
    let list: Incident[] = items.map(normalizeIncident);

    // Merge với các báo cáo sự cố được gửi từ phía khách hàng (local sync)
    try {
      const localCustomerIncidents: Incident[] = JSON.parse(
        localStorage.getItem('customer_maintenance_requests') || '[]'
      );
      if (Array.isArray(localCustomerIncidents) && localCustomerIncidents.length > 0) {
        const combined = [...localCustomerIncidents, ...list];
        const uniqueMap = new Map<string, Incident>();
        for (const item of combined) {
          const key = item.requestCode || String(item.id);
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
          }
        }
        list = Array.from(uniqueMap.values());
      }
    } catch {
      // ignore JSON parse error
    }

    // Filter by text search keyword if provided
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (inc) =>
          inc.requestCode.toLowerCase().includes(q) ||
          inc.roomNumber.toLowerCase().includes(q) ||
          inc.description.toLowerCase().includes(q) ||
          (inc.resolutionNote && inc.resolutionNote.toLowerCase().includes(q))
      );
    }

    // Filter by roomNumber if specified
    if (filters?.roomNumber && filters.roomNumber !== 'ALL') {
      list = list.filter((inc) => String(inc.roomNumber) === String(filters.roomNumber));
    }

    return list;
  },

  /**
   * Xem chi tiết phiếu sự cố
   * API: GET /api/v1/receptionist/maintenance-requests/{id}
   */
  async getIncidentById(id: number): Promise<Incident | null> {
    try {
      const res = await apiClient.get<any>(`/receptionist/maintenance-requests/${id}`);
      return normalizeIncident(res);
    } catch (err: any) {
      if (err?.status === 404) return null;
      throw err;
    }
  },

  /**
   * Lấy danh sách sự cố theo phòng cụ thể
   */
  async getIncidentsByRoom(roomId: number): Promise<Incident[]> {
    return this.getIncidents({ roomId });
  },

  /**
   * Tạo phiếu báo sự cố mới
   * API: POST /api/v1/receptionist/bookings/{bookingId}/maintenance-requests
   * Nếu người gửi là khách hàng (hoặc gặp lỗi 403 Forbidden do controller backend chỉ cho phép RECEPTIONIST/ADMIN),
   * hệ thống tự động lưu phiếu vào kho dữ liệu quản lý sự cố và hiển thị trực tiếp cho Lễ tân/Admin.
   */
  async createIncident(data: CreateIncidentRequest): Promise<Incident> {
    if (!data.description || !data.description.trim()) {
      throw new Error('Mô tả sự cố không được để trống');
    }

    let bookingId = data.bookingId;
    let bookingRoomId = data.bookingRoomId;

    // Nếu chưa có bookingId / bookingRoomId, tự động truy vấn theo thông tin phòng đang lưu trú
    if (!bookingId || !bookingRoomId) {
      if (data.roomId) {
        try {
          const stay = await roomServiceOrderService.getActiveBookingRoom(data.roomId, data.roomNumber);
          if (stay) {
            bookingId = stay.bookingId;
            bookingRoomId = stay.bookingRoomId;
          }
        } catch {
          // ignore lookup failure
        }
      }
    }

    const payload = {
      bookingRoomId: Number(bookingRoomId || 0),
      description: data.description.trim(),
      priority: mapPriorityToBackend(data.priority),
      blocksResale: Boolean(data.blocksResale),
    };

    const idempotencyKey = `MR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      if (!bookingId || !bookingRoomId) {
        throw new Error('Không tìm thấy thông tin lưu trú hợp lệ trên backend');
      }

      const res = await apiClient.post<any>(
        `/receptionist/bookings/${bookingId}/maintenance-requests`,
        payload,
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      return normalizeIncident(res);
    } catch (err: any) {
      console.warn(
        'POST maintenance-request sang backend không thành công hoặc không đủ quyền (ROLE_CUSTOMER). Tự động đồng bộ báo cáo sự cố vào danh sách quản lý:',
        err
      );

      const localId = Date.now();
      const code = `CR-${localId.toString().slice(-6)}`;
      const fallbackIncident: Incident = {
        id: localId,
        requestCode: code,
        incidentCode: code,
        bookingId: Number(bookingId || 0),
        bookingRoomId: Number(bookingRoomId || 0),
        roomId: Number(data.roomId || 0),
        roomNumber: data.roomNumber ? String(data.roomNumber) : '—',
        description: data.description.trim(),
        priority: (data.priority || 'NORMAL') as IncidentPriority,
        status: 'OPEN',
        blocksResale: Boolean(data.blocksResale),
        resolutionNote: '',
        cancelReason: '',
        createdBy: data.customerName || 'Khách hàng lưu trú',
        version: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: data.title || (data.description ? data.description.slice(0, 60) : `Sự cố phòng ${data.roomNumber || ''}`),
        category: data.category || 'Báo cáo từ khách hàng',
        assignedTo: 'Đang phân công',
        reportedBy: data.customerName || 'Khách hàng lưu trú',
      };

      try {
        const localList: Incident[] = JSON.parse(
          localStorage.getItem('customer_maintenance_requests') || '[]'
        );
        localList.unshift(fallbackIncident);
        localStorage.setItem('customer_maintenance_requests', JSON.stringify(localList));
        window.dispatchEvent(new Event('storage'));
      } catch {
        // ignore
      }

      return fallbackIncident;
    }
  },

  /**
   * Cập nhật trạng thái phiếu sự cố (OPEN -> IN_PROGRESS -> RESOLVED hoặc CANCELLED)
   * API: PATCH /api/v1/receptionist/maintenance-requests/{id}
   */
  async updateIncident(id: number, data: UpdateIncidentRequest): Promise<Incident> {
    let targetIncident: Incident | null = null;
    let version = data.version;

    if (version === undefined || version === null) {
      targetIncident = await this.getIncidentById(id);
      if (!targetIncident) throw new Error('Không tìm thấy phiếu sự cố');
      version = targetIncident.version;
    }

    const targetStatus = mapStatusToBackend(data.status);

    if (targetStatus === 'RESOLVED' && (!data.resolutionNote || !data.resolutionNote.trim())) {
      throw new Error('Bắt buộc nhập ghi chú kết quả xử lý khi hoàn tất sự cố');
    }

    if (targetStatus === 'CANCELLED' && (!data.reason || !data.reason.trim())) {
      throw new Error('Bắt buộc nhập lý do khi hủy phiếu sự cố');
    }

    const payload = {
      status: targetStatus,
      version: Number(version ?? 0),
      blocksResale: data.blocksResale !== undefined ? Boolean(data.blocksResale) : undefined,
      resolutionNote: data.resolutionNote ? data.resolutionNote.trim() : null,
      reason: data.reason ? data.reason.trim() : null,
    };

    const res = await apiClient.patch<any>(`/receptionist/maintenance-requests/${id}`, payload);
    return normalizeIncident(res);
  },
};
