// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - DASHBOARD MOCK DATA
// File: src/mock/dashboardMock.ts
// =============================================================================

import { DashboardSummaryResponse } from '../types/dashboard';

export const MOCK_DASHBOARD_SUMMARY: DashboardSummaryResponse = {
  dateFrom: '2026-10-01',
  dateTo: '2026-10-31',
  expectedRevenue: 25000000,
  actualRevenue: 18000000,
  refundTotal: 1800000,
  occupancyRate: 0.72,
  roomCounts: {
    AVAILABLE: 6,
    OCCUPIED: 2,
    CLEANING: 1,
    MAINTENANCE: 1,
  },
  totalBookings: 7,
  confirmedBookings: 2,
};
