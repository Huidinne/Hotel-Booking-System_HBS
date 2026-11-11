// =============================================================================
// HOTEL BOOKING SYSTEM - DASHBOARD SERVICE
// File: src/services/dashboardService.ts
// Direct integration with Spring Boot /api/v1/admin/dashboard/summary
// Contract: [SP2-1109-THANH] - docs/api/dashboard.md
// =============================================================================

import { apiClient } from './apiClient';
import { DashboardSummaryResponse } from '../types/dashboard';

export const dashboardService = {
  /**
   * Admin dashboard summary: GET /api/v1/admin/dashboard/summary
   */
  async getDashboardSummary(dateFrom?: string, dateTo?: string): Promise<DashboardSummaryResponse> {
    const query = new URLSearchParams();
    if (dateFrom) query.append('dateFrom', dateFrom);
    if (dateTo) query.append('dateTo', dateTo);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const raw = await apiClient.get<any>(`/admin/dashboard/summary${queryString}`);

    return {
      dateFrom: raw?.dateFrom || dateFrom || '',
      dateTo: raw?.dateTo || dateTo || '',
      roomRevenue: Number(raw?.roomRevenue || 0),
      netCashFlow: Number(raw?.netCashFlow || 0),
      expectedRevenue: Number(raw?.expectedRevenue || 0),
      actualRevenue: Number(raw?.actualRevenue || 0),
      totalPaid: Number(raw?.totalPaid || 0),
      refundTotal: Number(raw?.refundTotal || 0),
      adr: Number(raw?.adr || 0),
      revpar: Number(raw?.revpar || 0),
      occupancyRate: Number(raw?.occupancyRate || 0),
      soldRoomNights: Number(raw?.soldRoomNights || 0),
      totalAvailableRoomNights: Number(raw?.totalAvailableRoomNights || 0),
      totalRooms: Number(raw?.totalRooms || 0),
      activeRooms: Number(raw?.activeRooms || 0),
      roomCounts: raw?.roomCounts || {
        AVAILABLE: 0,
        OCCUPIED: 0,
        CLEANING: 0,
        MAINTENANCE: 0,
      },
      totalBookings: Number(raw?.totalBookings || 0),
      confirmedBookings: Number(raw?.confirmedBookings || 0),
      revenueSeries: raw?.revenueSeries || [],
      roomTypeRevenues: raw?.roomTypeRevenues || [],
    };
  },

  /**
   * Monthly revenue analytics (12 months): GET /api/v1/admin/dashboard/monthly-revenue
   * Contract: [SP3-1111-THANH] - docs/api/dashboard.md
   */
  async getMonthlyRevenue(params?: { year?: number; startDate?: string; endDate?: string }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.year) query.append('year', String(params.year));
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const raw = await apiClient.get<any>(`/admin/dashboard/monthly-revenue${queryString}`);
    return raw;
  },
};
