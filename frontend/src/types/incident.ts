// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - ROOM INCIDENT TYPES (SPRINT 4)
// File: src/types/incident.ts
// =============================================================================

export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus = 'REPORTED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Incident {
  id: number;
  incidentCode: string; // Mã phiếu sự cố (ví dụ: INC-20261116-01)
  roomId: number; // ID phòng vật lý
  roomNumber: string; // Số phòng
  bookingId?: number; // Booking ID liên quan (nếu phòng đang có khách)
  bookingCode?: string; // Mã booking liên quan
  bookingRoomId?: string | number; // Lượt lưu trú BookingRoom liên quan
  customerName?: string; // Tên khách hàng đang lưu trú (nếu có)
  category: string; // Loại sự cố (Hỏng điều hòa, Điện nước / Rò rỉ, Khóa cửa / Thẻ từ...)
  title: string; // Tiêu đề sự cố
  description: string; // Mô tả chi tiết vấn đề
  priority: IncidentPriority; // Mức độ ưu tiên: LOW, MEDIUM, HIGH, CRITICAL
  status: IncidentStatus; // Trạng thái xử lý: REPORTED, IN_PROGRESS, RESOLVED, CLOSED
  blocksResale: boolean; // Bật: Chặn bán lại phòng | Tắt: Không chặn bán lại phòng
  reportedBy: string; // Người lập phiếu (Lễ tân / Nhân viên)
  assignedTo?: string; // Kỹ thuật viên / Bộ phận xử lý
  createdAt: string; // Thời gian lập phiếu
  updatedAt: string; // Thời gian cập nhật gần nhất
  resolvedAt?: string; // Thời gian hoàn tất xử lý
  resolutionNote?: string; // Ghi chú kết quả xử lý
}

export interface CreateIncidentRequest {
  roomId: number;
  roomNumber: string;
  bookingId?: number;
  bookingCode?: string;
  bookingRoomId?: string | number;
  customerName?: string;
  category: string;
  title?: string;
  description: string;
  priority: IncidentPriority;
  blocksResale: boolean;
}

export interface UpdateIncidentRequest {
  category?: string;
  title?: string;
  description?: string;
  priority?: IncidentPriority;
  status?: IncidentStatus;
  blocksResale?: boolean;
  assignedTo?: string;
  resolutionNote?: string;
}
