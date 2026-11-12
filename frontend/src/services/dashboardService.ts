// =============================================================================
// HOTEL BOOKING SYSTEM - DASHBOARD SERVICE
// File: src/services/dashboardService.ts
// Direct integration with Spring Boot Backend Admin Dashboard APIs:
// 1. GET /api/v1/admin/dashboard/summary (Contract: [SP2-1109-THANH])
// 2. GET /api/v1/admin/dashboard/monthly-revenue (Contract: [SP3-1111-THANH])
// Reference: docs/api/dashboard.md
// =============================================================================

import { apiClient } from './apiClient';
import {
  DashboardSummaryResponse,
  DashboardMonthlyAnalyticsResponse,
  DashboardDailyRevenuePoint,
  DashboardRoomTypeRevenue,
  DashboardMonthlyRevenuePoint,
} from '../types/dashboard';

export const dashboardService = {
  /**
   * Admin dashboard summary: GET /api/v1/admin/dashboard/summary
   * Fetches core KPIs, accrual room revenue, cash flow, ADR, RevPAR, occupancy,
   * daily trend series, and room status counts.
   */
  async getDashboardSummary(dateFrom?: string, dateTo?: string): Promise<DashboardSummaryResponse> {
    const query = new URLSearchParams();
    if (dateFrom) query.append('dateFrom', dateFrom);
    if (dateTo) query.append('dateTo', dateTo);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const raw = await apiClient.get<DashboardSummaryResponse>(`/admin/dashboard/summary${queryString}`);

    // Safely map and normalize response without mock fallbacks
    const revenueSeries: DashboardDailyRevenuePoint[] = Array.isArray(raw?.revenueSeries)
      ? raw.revenueSeries.map((item) => ({
          date: item.date || '',
          roomRevenue: Number(item.roomRevenue || 0),
          netCashFlow: Number(item.netCashFlow || 0),
          soldRoomNights: Number(item.soldRoomNights || 0),
          availableRooms: Number(item.availableRooms || 0),
          occupancyRate: Number(item.occupancyRate || 0),
          adr: Number(item.adr || 0),
          revpar: Number(item.revpar || 0),
        }))
      : [];

    const roomTypeRevenues: DashboardRoomTypeRevenue[] = Array.isArray(raw?.roomTypeRevenues)
      ? raw.roomTypeRevenues.map((rt) => ({
          roomTypeId: rt.roomTypeId,
          roomTypeName: rt.roomTypeName || '',
          roomRevenue: Number(rt.roomRevenue || 0),
          revenue: Number(rt.revenue ?? rt.roomRevenue ?? 0),
          soldRoomNights: Number(rt.soldRoomNights || 0),
          revenueShare: rt.revenueShare != null ? Number(rt.revenueShare) : 0,
          percentage:
            rt.percentage != null
              ? Number(rt.percentage)
              : rt.revenueShare != null
              ? Math.round(Number(rt.revenueShare) * 10000) / 100
              : 0,
        }))
      : [];

    return {
      dateFrom: raw?.dateFrom || dateFrom || '',
      dateTo: raw?.dateTo || dateTo || '',
      roomRevenue: Number(raw?.roomRevenue ?? 0),
      netCashFlow: Number(raw?.netCashFlow ?? raw?.actualRevenue ?? 0),
      expectedRevenue: Number(raw?.expectedRevenue ?? 0),
      actualRevenue: Number(raw?.actualRevenue ?? raw?.netCashFlow ?? 0),
      totalPaid: Number(raw?.totalPaid ?? 0),
      refundTotal: Number(raw?.refundTotal ?? 0),
      adr: Number(raw?.adr ?? 0),
      revpar: Number(raw?.revpar ?? 0),
      occupancyRate: Number(raw?.occupancyRate ?? 0),
      soldRoomNights: Number(raw?.soldRoomNights ?? 0),
      totalAvailableRoomNights: Number(raw?.totalAvailableRoomNights ?? 0),
      totalRooms: Number(raw?.totalRooms ?? 0),
      activeRooms: Number(raw?.activeRooms ?? 0),
      roomCounts: {
        AVAILABLE: Number(raw?.roomCounts?.AVAILABLE ?? 0),
        OCCUPIED: Number(raw?.roomCounts?.OCCUPIED ?? 0),
        CLEANING: Number(raw?.roomCounts?.CLEANING ?? 0),
        MAINTENANCE: Number(raw?.roomCounts?.MAINTENANCE ?? 0),
      },
      totalBookings: Number(raw?.totalBookings ?? 0),
      confirmedBookings: Number(raw?.confirmedBookings ?? 0),
      revenueSeries,
      roomTypeRevenues,
    };
  },

  /**
   * Monthly revenue analytics (12 months): GET /api/v1/admin/dashboard/monthly-revenue
   * Contract: [SP3-1111-THANH] - docs/api/dashboard.md
   */
  async getMonthlyRevenue(params?: {
    year?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<DashboardMonthlyAnalyticsResponse> {
    const query = new URLSearchParams();
    if (params?.year) query.append('year', String(params.year));
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const raw = await apiClient.get<DashboardMonthlyAnalyticsResponse>(`/admin/dashboard/monthly-revenue${queryString}`);

    const monthly: DashboardMonthlyRevenuePoint[] = Array.isArray(raw?.monthly)
      ? raw.monthly.map((m) => ({
          month: m.month || '',
          monthKey: m.monthKey || '',
          monthIndex: Number(m.monthIndex || 0),
          year: Number(m.year || 0),
          revenue: Number(m.revenue ?? m.roomRevenue ?? 0),
          roomRevenue: Number(m.roomRevenue ?? m.revenue ?? 0),
          netCashFlow: Number(m.netCashFlow ?? 0),
          totalPaid: Number(m.totalPaid ?? 0),
          refundTotal: Number(m.refundTotal ?? 0),
          soldRoomNights: Number(m.soldRoomNights ?? 0),
          availableRoomNights: Number(m.availableRoomNights ?? 0),
          adr: Number(m.adr ?? 0),
          revpar: Number(m.revpar ?? 0),
          occupancyRate: Number(m.occupancyRate ?? 0),
        }))
      : [];

    const roomTypes: DashboardRoomTypeRevenue[] = Array.isArray(raw?.roomTypes)
      ? raw.roomTypes.map((rt) => ({
          roomTypeId: rt.roomTypeId,
          roomTypeName: rt.roomTypeName || '',
          roomRevenue: Number(rt.roomRevenue ?? rt.revenue ?? 0),
          revenue: Number(rt.revenue ?? rt.roomRevenue ?? 0),
          soldRoomNights: Number(rt.soldRoomNights ?? 0),
          revenueShare: rt.revenueShare != null ? Number(rt.revenueShare) : 0,
          percentage:
            rt.percentage != null
              ? Number(rt.percentage)
              : rt.revenueShare != null
              ? Math.round(Number(rt.revenueShare) * 10000) / 100
              : 0,
        }))
      : [];

    return {
      year: Number(raw?.year || new Date().getFullYear()),
      startDate: raw?.startDate,
      endDate: raw?.endDate,
      totalRevenue: Number(raw?.totalRevenue ?? 0),
      totalRoomRevenue: Number(raw?.totalRoomRevenue ?? 0),
      totalNetCashFlow: Number(raw?.totalNetCashFlow ?? 0),
      averageAdr: Number(raw?.averageAdr ?? 0),
      averageRevpar: Number(raw?.averageRevpar ?? 0),
      averageOccupancyRate: Number(raw?.averageOccupancyRate ?? 0),
      totalSoldRoomNights: Number(raw?.totalSoldRoomNights ?? 0),
      totalAvailableRoomNights: Number(raw?.totalAvailableRoomNights ?? 0),
      monthly,
      roomTypes,
    };
  },

  /**
   * Export Admin Dashboard CSV report: GET /api/v1/admin/dashboard/export-csv
   * Downloads CSV file with UTF-8 BOM and formula injection protection.
   * Contract: [SP3-1112-THANH] - docs/api/dashboard.md
   */
  async exportDashboardCsv(dateFrom?: string, dateTo?: string, reportType: string = 'full'): Promise<Blob> {
    const query = new URLSearchParams();
    if (dateFrom) query.append('dateFrom', dateFrom);
    if (dateTo) query.append('dateTo', dateTo);
    if (reportType) query.append('reportType', reportType);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const blob = await apiClient.downloadBlob(
      `/admin/dashboard/export-csv${queryString}`,
      ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'application/octet-stream']
    );

    if (!blob || blob.size === 0) {
      throw new Error('File báo cáo CSV trả về rỗng, không có dữ liệu để tải.');
    }

    const blobType = (blob.type || '').toLowerCase();
    if (blobType.includes('application/json') || blobType.includes('text/html')) {
      const text = await blob.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json?.message || json?.error || 'Máy chủ trả về dữ liệu lỗi thay vì file CSV.');
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new Error('Máy chủ trả về định dạng không phải CSV.');
        }
        throw e;
      }
    }

    // Kiểm tra nội dung thực tế bên trong Blob phòng trường hợp Backend/Proxy trả JSON lỗi dưới MIME text/csv hoặc rỗng MIME
    const headText = (await blob.slice(0, 512).text()).trim();
    if (headText.startsWith('{') || headText.startsWith('[')) {
      const fullText = await blob.text();
      try {
        const parsed = JSON.parse(fullText);
        if (parsed && typeof parsed === 'object') {
          throw new Error(parsed.message || parsed.error || 'Dữ liệu trả về là JSON lỗi, không thể xuất file CSV.');
        }
      } catch (e) {
        if (!(e instanceof SyntaxError)) {
          throw e;
        }
      }
    }

    return blob;
  },

  /**
   * Helper function to trigger browser file download from Blob
   */
  downloadCsvFile(blob: Blob, filename?: string) {
    const finalName = filename || `dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', finalName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  },
};
