// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - DASHBOARD & METRICS INTERFACES
// File: src/types/dashboard.ts
// =============================================================================

export interface RoomCounts {
  AVAILABLE: number;
  OCCUPIED: number;
  CLEANING: number;
  MAINTENANCE: number;
}

export interface DashboardSummaryResponse {
  dateFrom: string;
  dateTo: string;
  expectedRevenue: number;
  actualRevenue: number;
  refundTotal: number;
  occupancyRate: number; // 0 to 1, e.g. 0.72 (72%)
  roomCounts: RoomCounts;
  totalBookings?: number;
  confirmedBookings?: number;
}
