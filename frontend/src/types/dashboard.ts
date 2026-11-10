// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - DASHBOARD & METRICS INTERFACES
// File: src/types/dashboard.ts
// Handled by: Phan Thuận Thành (Backend) & Nguyễn Thị Yến (Frontend)
// API Contract: [SP2-1109-THANH] - docs/api/dashboard.md
// =============================================================================

export interface RoomCounts {
  AVAILABLE: number;
  OCCUPIED: number;
  CLEANING: number;
  MAINTENANCE: number;
}

export interface DashboardDailyRevenuePoint {
  date: string;
  roomRevenue: number;
  netCashFlow: number;
  soldRoomNights: number;
  availableRooms: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
}

export interface DashboardRoomTypeRevenue {
  roomTypeId: number;
  roomTypeName: string;
  roomRevenue: number;
  soldRoomNights: number;
  revenueShare: number;
}

// =============================================================================
// REVENUE & ROOM TYPE ANALYTICS TYPES (Task: Nguyễn Thị Yến - Frontend)
// =============================================================================

export interface MonthlyRevenue {
  month: string;      // e.g. "2026-01" or "Tháng 01/2026"
  revenue: number;    // e.g. 45000000 (VNĐ)
}

export interface RoomTypeRevenue {
  roomTypeId: number | string;
  roomTypeName: string;
  revenue: number;    // VNĐ
  percentage?: number; // 0 - 100 (%)
}

export interface DashboardDateRange {
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
}

export interface DashboardChartState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

export interface DashboardSummaryResponse {
  dateFrom: string;
  dateTo: string;
  // Revenue & Cash Flow
  roomRevenue?: number;      // Doanh thu lưu trú phát sinh trong kỳ (Accrual Basis)
  netCashFlow?: number;      // Dòng tiền thực thu ròng (Cash Basis: totalPaid - refundTotal)
  expectedRevenue: number;   // Doanh thu dự kiến
  actualRevenue: number;     // Doanh thu thực thu (Tương thích ngược, tương đương netCashFlow)
  totalPaid?: number;        // Tổng tiền thu vào qua VNPay/tiền mặt
  refundTotal: number;       // Tổng tiền cọc đã hoàn
  // Hotel Performance Metrics
  adr?: number;              // Average Daily Rate = roomRevenue / soldRoomNights
  revpar?: number;           // Revenue Per Available Room = roomRevenue / totalAvailableRoomNights
  occupancyRate: number;     // Tỷ lệ lấp đầy (0 to 1, e.g. 0.72 = 72%)
  soldRoomNights?: number;   // Số đêm phòng đã bán trong kỳ
  totalAvailableRoomNights?: number; // Tổng đêm phòng khả dụng
  // Rooms & Bookings
  totalRooms?: number;
  activeRooms?: number;
  totalBookings?: number;
  confirmedBookings?: number;
  roomCounts: RoomCounts;
  // Series & Breakdown
  revenueSeries?: DashboardDailyRevenuePoint[];
  roomTypeRevenues?: DashboardRoomTypeRevenue[];
}
