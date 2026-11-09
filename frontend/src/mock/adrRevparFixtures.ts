// =============================================================================
// HOTEL BOOKING SYSTEM - ADR & REVPAR OFFICIAL TEST FIXTURES
// File: src/mock/adrRevparFixtures.ts
// Contract Source: docs/api/dashboard.md (Mã công việc: [SP2-1109-THANH])
// Standard Hotel Accounting: USALI (Uniform System of Accounts for the Lodging Industry)
// =============================================================================

import { DashboardSummaryResponse } from '../types/dashboard';

/**
 * Fixture 1: Tháng Hoạt Động Tiêu Chuẩn (Standard Month - 10/2026)
 * - Doanh thu lưu trú (Accrual): 57,000,000 đ
 * - Dòng tiền thực thu (Net Cash Flow): 52,500,000 đ
 * - ADR = 950,000 đ (roomRevenue / soldRoomNights = 57,000,000 / 60)
 * - RevPAR = 570,000 đ (roomRevenue / totalAvailableRoomNights = 57,000,000 / 100 = ADR * Occupancy)
 * - Occupancy Rate = 60% (soldRoomNights / totalAvailableRoomNights = 60 / 100)
 */
export const ADR_REVPAR_STANDARD_FIXTURE: DashboardSummaryResponse = {
  dateFrom: '2026-10-01',
  dateTo: '2026-10-31',
  roomRevenue: 57000000.0,
  netCashFlow: 52500000.0,
  expectedRevenue: 60000000.0,
  actualRevenue: 52500000.0,
  totalPaid: 55000000.0,
  refundTotal: 2500000.0,
  adr: 950000.0,
  revpar: 570000.0,
  occupancyRate: 0.6,
  soldRoomNights: 60,
  totalAvailableRoomNights: 100,
  totalRooms: 10,
  activeRooms: 10,
  totalBookings: 25,
  confirmedBookings: 22,
  roomCounts: {
    AVAILABLE: 4,
    OCCUPIED: 4,
    CLEANING: 1,
    MAINTENANCE: 1,
  },
  revenueSeries: [
    {
      date: '2026-10-01',
      roomRevenue: 1900000.0,
      netCashFlow: 1900000.0,
      soldRoomNights: 2,
      availableRooms: 10,
      occupancyRate: 0.2,
      adr: 950000.0,
      revpar: 190000.0,
    },
    {
      date: '2026-10-02',
      roomRevenue: 2850000.0,
      netCashFlow: 2850000.0,
      soldRoomNights: 3,
      availableRooms: 10,
      occupancyRate: 0.3,
      adr: 950000.0,
      revpar: 285000.0,
    },
    {
      date: '2026-10-03',
      roomRevenue: 3800000.0,
      netCashFlow: 3800000.0,
      soldRoomNights: 4,
      availableRooms: 10,
      occupancyRate: 0.4,
      adr: 950000.0,
      revpar: 380000.0,
    },
    {
      date: '2026-10-04',
      roomRevenue: 4750000.0,
      netCashFlow: 4750000.0,
      soldRoomNights: 5,
      availableRooms: 10,
      occupancyRate: 0.5,
      adr: 950000.0,
      revpar: 475000.0,
    },
    {
      date: '2026-10-05',
      roomRevenue: 5700000.0,
      netCashFlow: 4750000.0,
      soldRoomNights: 6,
      availableRooms: 10,
      occupancyRate: 0.6,
      adr: 950000.0,
      revpar: 570000.0,
    },
    {
      date: '2026-10-06',
      roomRevenue: 6650000.0,
      netCashFlow: 6650000.0,
      soldRoomNights: 7,
      availableRooms: 10,
      occupancyRate: 0.7,
      adr: 950000.0,
      revpar: 665000.0,
    },
    {
      date: '2026-10-07',
      roomRevenue: 7600000.0,
      netCashFlow: 7600000.0,
      soldRoomNights: 8,
      availableRooms: 10,
      occupancyRate: 0.8,
      adr: 950000.0,
      revpar: 760000.0,
    },
  ],
  roomTypeRevenues: [
    {
      roomTypeId: 1,
      roomTypeName: 'Standard Single Room',
      roomRevenue: 10000000.0,
      soldRoomNights: 20,
      revenueShare: 0.1754,
    },
    {
      roomTypeId: 2,
      roomTypeName: 'Deluxe Double Room',
      roomRevenue: 28500000.0,
      soldRoomNights: 30,
      revenueShare: 0.5,
    },
    {
      roomTypeId: 3,
      roomTypeName: 'Executive Suite Luxury',
      roomRevenue: 18500000.0,
      soldRoomNights: 10,
      revenueShare: 0.3246,
    },
  ],
};

/**
 * Fixture 2: Booking Vắt Qua Tháng (Cross-Month Booking)
 * - Khách ở 6 đêm (4 đêm tháng 10, 2 đêm tháng 11)
 * - roomRevenue tháng 10: 4 x 950,000 = 3,800,000 đ
 * - ADR = 950,000 đ
 * - RevPAR = 126,666.67 đ (3,800,000 / 30)
 * - Occupancy Rate = 13.33% (4 / 30)
 */
export const ADR_REVPAR_CROSS_MONTH_FIXTURE: DashboardSummaryResponse = {
  dateFrom: '2026-10-01',
  dateTo: '2026-10-31',
  roomRevenue: 3800000.0,
  netCashFlow: 2850000.0,
  expectedRevenue: 5700000.0,
  actualRevenue: 2850000.0,
  totalPaid: 2850000.0,
  refundTotal: 0.0,
  adr: 950000.0,
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
  revenueSeries: [
    {
      date: '2026-10-28',
      roomRevenue: 950000.0,
      netCashFlow: 2850000.0,
      soldRoomNights: 1,
      availableRooms: 10,
      occupancyRate: 0.1,
      adr: 950000.0,
      revpar: 95000.0,
    },
    {
      date: '2026-10-29',
      roomRevenue: 950000.0,
      netCashFlow: 0.0,
      soldRoomNights: 1,
      availableRooms: 10,
      occupancyRate: 0.1,
      adr: 950000.0,
      revpar: 95000.0,
    },
    {
      date: '2026-10-30',
      roomRevenue: 950000.0,
      netCashFlow: 0.0,
      soldRoomNights: 1,
      availableRooms: 10,
      occupancyRate: 0.1,
      adr: 950000.0,
      revpar: 95000.0,
    },
    {
      date: '2026-10-31',
      roomRevenue: 950000.0,
      netCashFlow: 0.0,
      soldRoomNights: 1,
      availableRooms: 10,
      occupancyRate: 0.1,
      adr: 950000.0,
      revpar: 95000.0,
    },
  ],
};

/**
 * Fixture 3: Có Hủy Phòng & Hoàn Tiền Cọc (Cancellation & Refund)
 * - Khách hủy phòng trước 24h, hoàn 100% cọc: refundTotal = 950,000 đ
 * - Doanh thu lưu trú = 0.0 (không ở thực tế)
 * - netCashFlow = totalPaid - refundTotal = 950,000 - 950,000 = 0.0 đ
 * - ADR = 0.0 đ, RevPAR = 0.0 đ, Occupancy = 0.0
 */
export const ADR_REVPAR_REFUND_FIXTURE: DashboardSummaryResponse = {
  dateFrom: '2026-11-01',
  dateTo: '2026-11-07',
  roomRevenue: 0.0,
  netCashFlow: 0.0,
  expectedRevenue: 0.0,
  actualRevenue: 0.0,
  totalPaid: 950000.0,
  refundTotal: 950000.0,
  adr: 0.0,
  revpar: 0.0,
  occupancyRate: 0.0,
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
  revenueSeries: [
    {
      date: '2026-11-01',
      roomRevenue: 0.0,
      netCashFlow: 0.0,
      soldRoomNights: 0,
      availableRooms: 10,
      occupancyRate: 0.0,
      adr: 0.0,
      revpar: 0.0,
    },
  ],
};

/**
 * Fixture 4: Biên Mẫu Số 0 (Zero Denominator Safety)
 * - Toàn bộ phòng bảo trì (activeRooms = 0, totalAvailableRoomNights = 0)
 * - Không có khách lưu trú (soldRoomNights = 0)
 * - ADR = 0.0 đ, RevPAR = 0.0 đ, Occupancy Rate = 0.0
 */
export const ADR_REVPAR_ZERO_DENOMINATOR_FIXTURE: DashboardSummaryResponse = {
  dateFrom: '2026-05-01',
  dateTo: '2026-05-07',
  roomRevenue: 0.0,
  netCashFlow: 0.0,
  expectedRevenue: 0.0,
  actualRevenue: 0.0,
  totalPaid: 0.0,
  refundTotal: 0.0,
  adr: 0.0,
  revpar: 0.0,
  occupancyRate: 0.0,
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
  revenueSeries: [],
};
