// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - DASHBOARD MOCK DATA & FIXTURES
// File: src/mock/dashboardMock.ts
// Handled by: Phan Thuận Thành (Backend) & Nguyễn Thị Yến (Frontend)
// API Contract: [SP2-1109-THANH] - docs/api/dashboard.md
// =============================================================================

import { DashboardSummaryResponse } from '../types/dashboard';

export * from './adrRevparFixtures';

/**
 * Fixture 1: Tháng chuẩn (Standard Month - Tháng 10/2026)
 * Đầy đủ chỉ số ADR, RevPAR, phân biệt doanh thu lưu trú và dòng tiền.
 */
export const MOCK_DASHBOARD_SUMMARY: DashboardSummaryResponse = {
  dateFrom: '2026-10-01',
  dateTo: '2026-10-31',
  roomRevenue: 28500000,
  netCashFlow: 18000000,
  expectedRevenue: 25000000,
  actualRevenue: 18000000,
  totalPaid: 19800000,
  refundTotal: 1800000,
  adr: 950000,
  revpar: 306451.61,
  occupancyRate: 0.72,
  soldRoomNights: 30,
  totalAvailableRoomNights: 93,
  totalRooms: 10,
  activeRooms: 9,
  totalBookings: 7,
  confirmedBookings: 2,
  roomCounts: {
    AVAILABLE: 6,
    OCCUPIED: 2,
    CLEANING: 1,
    MAINTENANCE: 1,
  },
  revenueSeries: [
    {
      date: '2026-10-01',
      roomRevenue: 950000,
      netCashFlow: 950000,
      soldRoomNights: 1,
      availableRooms: 9,
      occupancyRate: 0.1111,
      adr: 950000,
      revpar: 105555.56,
    },
    {
      date: '2026-10-02',
      roomRevenue: 1900000,
      netCashFlow: 950000,
      soldRoomNights: 2,
      availableRooms: 9,
      occupancyRate: 0.2222,
      adr: 950000,
      revpar: 211111.11,
    },
    {
      date: '2026-10-03',
      roomRevenue: 1900000,
      netCashFlow: 1900000,
      soldRoomNights: 2,
      availableRooms: 9,
      occupancyRate: 0.2222,
      adr: 950000,
      revpar: 211111.11,
    },
  ],
  roomTypeRevenues: [
    {
      roomTypeId: 1,
      roomTypeName: 'Standard Single Room',
      roomRevenue: 3000000,
      soldRoomNights: 6,
      revenueShare: 0.1053,
    },
    {
      roomTypeId: 2,
      roomTypeName: 'Deluxe Double Room',
      roomRevenue: 19000000,
      soldRoomNights: 20,
      revenueShare: 0.6667,
    },
    {
      roomTypeId: 3,
      roomTypeName: 'Executive Suite Luxury',
      roomRevenue: 6500000,
      soldRoomNights: 4,
      revenueShare: 0.2281,
    },
  ],
};

/**
 * Fixture 2: Booking vắt qua tháng (Cross-month Booking)
 */
export const MOCK_DASHBOARD_CROSS_MONTH: DashboardSummaryResponse = {
  dateFrom: '2026-10-01',
  dateTo: '2026-10-31',
  roomRevenue: 3800000,
  netCashFlow: 2850000,
  expectedRevenue: 5700000,
  actualRevenue: 2850000,
  totalPaid: 2850000,
  refundTotal: 0,
  adr: 950000,
  revpar: 126666.67,
  occupancyRate: 0.1333,
  soldRoomNights: 4,
  totalAvailableRoomNights: 30,
  totalRooms: 10,
  activeRooms: 10,
  totalBookings: 1,
  confirmedBookings: 1,
  roomCounts: {
    AVAILABLE: 9,
    OCCUPIED: 1,
    CLEANING: 0,
    MAINTENANCE: 0,
  },
};

/**
 * Fixture 3: Có phát sinh hoàn cọc (Cancellation & Refund)
 */
export const MOCK_DASHBOARD_REFUND: DashboardSummaryResponse = {
  dateFrom: '2026-11-01',
  dateTo: '2026-11-07',
  roomRevenue: 0,
  netCashFlow: 0,
  expectedRevenue: 0,
  actualRevenue: 0,
  totalPaid: 950000,
  refundTotal: 950000,
  adr: 0,
  revpar: 0,
  occupancyRate: 0,
  soldRoomNights: 0,
  totalAvailableRoomNights: 70,
  totalRooms: 10,
  activeRooms: 10,
  totalBookings: 1,
  confirmedBookings: 0,
  roomCounts: {
    AVAILABLE: 10,
    OCCUPIED: 0,
    CLEANING: 0,
    MAINTENANCE: 0,
  },
};

/**
 * Fixture 4: Mẫu số 0 (Zero Denominator)
 */
export const MOCK_DASHBOARD_ZERO_DENOMINATOR: DashboardSummaryResponse = {
  dateFrom: '2026-05-01',
  dateTo: '2026-05-07',
  roomRevenue: 0,
  netCashFlow: 0,
  expectedRevenue: 0,
  actualRevenue: 0,
  totalPaid: 0,
  refundTotal: 0,
  adr: 0,
  revpar: 0,
  occupancyRate: 0,
  soldRoomNights: 0,
  totalAvailableRoomNights: 0,
  totalRooms: 2,
  activeRooms: 0,
  totalBookings: 0,
  confirmedBookings: 0,
  roomCounts: {
    AVAILABLE: 0,
    OCCUPIED: 0,
    CLEANING: 0,
    MAINTENANCE: 2,
  },
};
