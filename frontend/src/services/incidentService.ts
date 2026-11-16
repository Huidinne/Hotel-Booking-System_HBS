// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - ROOM INCIDENT SERVICE (SPRINT 4)
// File: src/services/incidentService.ts
// Handles room incident reports, priority, status, and blocksResale tracking.
// =============================================================================

import {
  CreateIncidentRequest,
  Incident,
  IncidentPriority,
  IncidentStatus,
  UpdateIncidentRequest,
} from '../types/incident';
import {
  INITIAL_INCIDENTS,
  getStoredIncidents,
  saveStoredIncidents,
} from '../mock/incidentMock';

const SIMULATE_LATENCY_MS = 250;

export interface IncidentFilterParams {
  search?: string; // Tìm theo mã phiếu, số phòng
  roomNumber?: string;
  category?: string;
  priority?: IncidentPriority | 'ALL';
  status?: IncidentStatus | 'ALL';
  blocksResale?: boolean | 'ALL';
}

export const incidentService = {
  /**
   * Lấy danh sách toàn bộ phiếu sự cố (hỗ trợ tìm kiếm và lọc đa điều kiện)
   * Target Backend Endpoint: GET /api/v1/incidents
   */
  async getIncidents(filters?: IncidentFilterParams): Promise<Incident[]> {
    await new Promise((res) => setTimeout(res, SIMULATE_LATENCY_MS));
    let incidents = getStoredIncidents();

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      incidents = incidents.filter(
        (inc) =>
          inc.incidentCode.toLowerCase().includes(q) ||
          inc.roomNumber.toLowerCase().includes(q) ||
          inc.title.toLowerCase().includes(q) ||
          inc.description.toLowerCase().includes(q) ||
          (inc.customerName && inc.customerName.toLowerCase().includes(q))
      );
    }

    if (filters?.roomNumber && filters.roomNumber !== 'ALL') {
      incidents = incidents.filter((inc) => String(inc.roomNumber) === String(filters.roomNumber));
    }

    if (filters?.category && filters.category !== 'ALL') {
      incidents = incidents.filter((inc) => inc.category === filters.category);
    }

    if (filters?.priority && filters.priority !== 'ALL') {
      incidents = incidents.filter((inc) => inc.priority === filters.priority);
    }

    if (filters?.status && filters.status !== 'ALL') {
      incidents = incidents.filter((inc) => inc.status === filters.status);
    }

    if (filters?.blocksResale !== undefined && filters.blocksResale !== 'ALL') {
      incidents = incidents.filter((inc) => inc.blocksResale === filters.blocksResale);
    }

    return [...incidents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  /**
   * Xem chi tiết phiếu sự cố
   * Target Backend Endpoint: GET /api/v1/incidents/{id}
   */
  async getIncidentById(id: number): Promise<Incident | null> {
    await new Promise((res) => setTimeout(res, 150));
    const incidents = getStoredIncidents();
    return incidents.find((inc) => inc.id === id) || null;
  },

  /**
   * Lấy sự cố theo phòng cụ thể
   */
  async getIncidentsByRoom(roomId: number): Promise<Incident[]> {
    await new Promise((res) => setTimeout(res, 150));
    const incidents = getStoredIncidents();
    return incidents.filter((inc) => inc.roomId === roomId);
  },

  /**
   * Tạo phiếu báo cáo sự cố mới
   * Target Backend Endpoint: POST /api/v1/incidents
   */
  async createIncident(data: CreateIncidentRequest): Promise<Incident> {
    await new Promise((res) => setTimeout(res, SIMULATE_LATENCY_MS));

    if (!data.roomId || !data.roomNumber) {
      throw new Error('Vui lòng chọn phòng xảy ra sự cố');
    }
    if (!data.category) {
      throw new Error('Vui lòng chọn loại sự cố');
    }
    if (!data.description || !data.description.trim()) {
      throw new Error('Mô tả chi tiết sự cố không được để trống');
    }
    if (!data.priority) {
      throw new Error('Vui lòng chọn mức độ ưu tiên');
    }

    const incidents = getStoredIncidents();
    const newId = incidents.length > 0 ? Math.max(...incidents.map((i) => i.id)) + 1 : 1;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const incidentCode = `INC-${dateStr}-${String(newId).padStart(2, '0')}`;

    const newIncident: Incident = {
      id: newId,
      incidentCode,
      roomId: Number(data.roomId),
      roomNumber: String(data.roomNumber),
      bookingId: data.bookingId,
      bookingCode: data.bookingCode,
      bookingRoomId: data.bookingRoomId,
      customerName: data.customerName,
      category: data.category,
      title: data.title?.trim() || `${data.category} - Phòng ${data.roomNumber}`,
      description: data.description.trim(),
      priority: data.priority,
      status: 'REPORTED',
      blocksResale: Boolean(data.blocksResale),
      reportedBy: 'Lễ tân trực ca',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    incidents.unshift(newIncident);
    saveStoredIncidents(incidents);
    return newIncident;
  },

  /**
   * Cập nhật phiếu sự cố (mô tả, ưu tiên, blocksResale, trạng thái xử lý)
   * Target Backend Endpoint: PUT /api/v1/incidents/{id}
   */
  async updateIncident(id: number, data: UpdateIncidentRequest): Promise<Incident> {
    await new Promise((res) => setTimeout(res, SIMULATE_LATENCY_MS));

    const incidents = getStoredIncidents();
    const index = incidents.findIndex((inc) => inc.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy phiếu sự cố với ID #${id}`);
    }

    const current = incidents[index];
    const now = new Date().toISOString();

    const updated: Incident = {
      ...current,
      category: data.category || current.category,
      title: data.title !== undefined ? data.title.trim() : current.title,
      description: data.description !== undefined ? data.description.trim() : current.description,
      priority: data.priority || current.priority,
      status: data.status || current.status,
      blocksResale: data.blocksResale !== undefined ? data.blocksResale : current.blocksResale,
      assignedTo: data.assignedTo !== undefined ? data.assignedTo.trim() : current.assignedTo,
      resolutionNote: data.resolutionNote !== undefined ? data.resolutionNote.trim() : current.resolutionNote,
      resolvedAt: data.status === 'RESOLVED' || data.status === 'CLOSED' ? (current.resolvedAt || now) : current.resolvedAt,
      updatedAt: now,
    };

    incidents[index] = updated;
    saveStoredIncidents(incidents);
    return updated;
  },

  /**
   * Reset mock data về ban đầu
   */
  async resetToDefault(): Promise<Incident[]> {
    saveStoredIncidents(INITIAL_INCIDENTS);
    return INITIAL_INCIDENTS;
  },
};
