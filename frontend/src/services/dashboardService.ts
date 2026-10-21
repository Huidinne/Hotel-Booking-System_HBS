// =============================================================================
// HOTEL BOOKING SYSTEM - DASHBOARD SERVICE
// File: src/services/dashboardService.ts
// Direct integration with Spring Boot /api/v1/admin/dashboard/summary
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
      expectedRevenue: Number(raw?.expectedRevenue || 0),
      actualRevenue: Number(raw?.actualRevenue || 0),
      refundTotal: Number(raw?.refundTotal || 0),
      occupancyRate: Number(raw?.occupancyRate || 0),
      roomCounts: raw?.roomCounts || {
        AVAILABLE: 0,
        OCCUPIED: 0,
        CLEANING: 0,
        MAINTENANCE: 0,
      },
      totalBookings: Number(raw?.totalBookings || 0),
      confirmedBookings: Number(raw?.confirmedBookings || 0),
    };
  },
};
