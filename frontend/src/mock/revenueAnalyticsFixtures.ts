// =============================================================================
// HOTEL BOOKING SYSTEM - REVENUE & ROOM TYPE ANALYTICS FIXTURES
// File: src/mock/revenueAnalyticsFixtures.ts
// Handled by: Nguyễn Thị Yến (Frontend)
// =============================================================================

import { MonthlyRevenue, RoomTypeRevenue, DashboardDateRange } from '../types/dashboard';

/**
 * TRƯỜNG HỢP 1: Không có dữ liệu (Empty State)
 */
export const FIXTURE_MONTHLY_EMPTY: MonthlyRevenue[] = [];
export const FIXTURE_ROOM_TYPE_EMPTY: RoomTypeRevenue[] = [];

/**
 * TRƯỜNG HỢP 2: Một tháng duy nhất (Single Month - Tháng 10/2026)
 */
export const FIXTURE_MONTHLY_SINGLE_MONTH: MonthlyRevenue[] = [
  {
    month: 'Tháng 10/2026',
    revenue: 28500000,
  },
];

export const FIXTURE_ROOM_TYPE_SINGLE_MONTH: RoomTypeRevenue[] = [
  {
    roomTypeId: 2,
    roomTypeName: 'Deluxe Double Room',
    revenue: 19000000,
    percentage: 66.67,
  },
  {
    roomTypeId: 3,
    roomTypeName: 'Executive Suite Luxury',
    revenue: 6500000,
    percentage: 22.81,
  },
  {
    roomTypeId: 1,
    roomTypeName: 'Standard Single Room',
    revenue: 3000000,
    percentage: 10.53,
  },
];

/**
 * TRƯỜNG HỢP 3: Đủ 12 tháng (Full 12 Months - Năm 2026)
 * Dữ liệu thể hiện đầy đủ từ tháng 1 đến tháng 12, biến thiên doanh thu thực tế
 */
export const FIXTURE_MONTHLY_FULL_YEAR: MonthlyRevenue[] = [
  { month: 'Tháng 01/2026', revenue: 45000000 },
  { month: 'Tháng 02/2026', revenue: 52000000 },
  { month: 'Tháng 03/2026', revenue: 38000000 },
  { month: 'Tháng 04/2026', revenue: 65000000 },
  { month: 'Tháng 05/2026', revenue: 78000000 },
  { month: 'Tháng 06/2026', revenue: 125500000 },
  { month: 'Tháng 07/2026', revenue: 142000000 },
  { month: 'Tháng 08/2026', revenue: 110000000 },
  { month: 'Tháng 09/2026', revenue: 58000000 },
  { month: 'Tháng 10/2026', revenue: 48000000 },
  { month: 'Tháng 11/2026', revenue: 35000000 },
  { month: 'Tháng 12/2026', revenue: 85000000 },
];

export const FIXTURE_ROOM_TYPE_FULL_YEAR: RoomTypeRevenue[] = [
  {
    roomTypeId: 2,
    roomTypeName: 'Deluxe Double Room',
    revenue: 410000000,
    percentage: 46.51,
  },
  {
    roomTypeId: 3,
    roomTypeName: 'Executive Suite Luxury',
    revenue: 244000000,
    percentage: 27.68,
  },
  {
    roomTypeId: 1,
    roomTypeName: 'Standard Single Room',
    revenue: 125000000,
    percentage: 14.18,
  },
  {
    roomTypeId: 4,
    roomTypeName: 'Family Ocean Suite',
    revenue: 102500000,
    percentage: 11.63,
  },
];

/**
 * TRƯỜNG HỢP KIỂM THỬ BIÊN: Tổng doanh thu = 0 (Zero Revenue - Tránh NaN / Infinity)
 */
export const FIXTURE_ROOM_TYPE_ZERO_REVENUE: RoomTypeRevenue[] = [
  {
    roomTypeId: 1,
    roomTypeName: 'Standard Single Room',
    revenue: 0,
    percentage: 0,
  },
  {
    roomTypeId: 2,
    roomTypeName: 'Deluxe Double Room',
    revenue: 0,
    percentage: 0,
  },
  {
    roomTypeId: 3,
    roomTypeName: 'Executive Suite Luxury',
    revenue: 0,
    percentage: 0,
  },
];

/**
 * Service mock lấy dữ liệu thống kê theo bộ lọc Date Range
 * Trả về Promise để mô phỏng chính xác trạng thái async, loading, error
 */
export const revenueAnalyticsMockService = {
  async fetchAnalytics(
    dateRange: DashboardDateRange,
    options?: { simulateError?: boolean; simulateLoadingDelay?: number; presetOverride?: string }
  ): Promise<{ monthly: MonthlyRevenue[]; roomTypes: RoomTypeRevenue[] }> {
    const delay = options?.simulateLoadingDelay ?? 200;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (options?.simulateError) {
      throw new Error('Lỗi kết nối máy chủ khi truy vấn báo cáo doanh thu. Vui lòng thử lại sau.');
    }

    if (options?.presetOverride === 'empty') {
      return { monthly: FIXTURE_MONTHLY_EMPTY, roomTypes: FIXTURE_ROOM_TYPE_EMPTY };
    }
    if (options?.presetOverride === 'single') {
      return { monthly: FIXTURE_MONTHLY_SINGLE_MONTH, roomTypes: FIXTURE_ROOM_TYPE_SINGLE_MONTH };
    }
    if (options?.presetOverride === 'full_year') {
      return { monthly: FIXTURE_MONTHLY_FULL_YEAR, roomTypes: FIXTURE_ROOM_TYPE_FULL_YEAR };
    }
    if (options?.presetOverride === 'zero') {
      return {
        monthly: [{ month: 'Tháng 05/2026', revenue: 0 }],
        roomTypes: FIXTURE_ROOM_TYPE_ZERO_REVENUE,
      };
    }

    // Logic tính toán theo dateRange nếu không ép preset
    const { startDate, endDate } = dateRange;
    if (!startDate || !endDate) {
      return { monthly: FIXTURE_MONTHLY_FULL_YEAR, roomTypes: FIXTURE_ROOM_TYPE_FULL_YEAR };
    }

    const startYear = parseInt(startDate.slice(0, 4), 10);
    const endYear = parseInt(endDate.slice(0, 4), 10);
    const startMonth = parseInt(startDate.slice(5, 7), 10);
    const endMonth = parseInt(endDate.slice(5, 7), 10);

    // Nếu khoảng thời gian chỉ gồm 1 tháng
    if (startYear === endYear && startMonth === endMonth) {
      const formattedMonth = `Tháng ${String(startMonth).padStart(2, '0')}/${startYear}`;
      const foundMonth = FIXTURE_MONTHLY_FULL_YEAR.find((m) => m.month.startsWith(`Tháng ${String(startMonth).padStart(2, '0')}`));
      return {
        monthly: [
          {
            month: formattedMonth,
            revenue: foundMonth ? foundMonth.revenue : 28500000,
          },
        ],
        roomTypes: FIXTURE_ROOM_TYPE_SINGLE_MONTH,
      };
    }

    // Nếu khoảng thời gian không có dữ liệu (ví dụ năm 2020)
    if (endYear < 2026 || startYear > 2026) {
      return { monthly: FIXTURE_MONTHLY_EMPTY, roomTypes: FIXTURE_ROOM_TYPE_EMPTY };
    }

    // Mặc định trả về dữ liệu 12 tháng năm 2026
    return {
      monthly: FIXTURE_MONTHLY_FULL_YEAR,
      roomTypes: FIXTURE_ROOM_TYPE_FULL_YEAR,
    };
  },
};
