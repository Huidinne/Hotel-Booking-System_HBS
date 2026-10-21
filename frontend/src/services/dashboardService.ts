// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - DASHBOARD SERVICE
// File: src/services/dashboardService.ts
// =============================================================================

import { DashboardSummaryResponse } from '../types/dashboard';
import { roomService } from './roomService';
import { bookingService } from './bookingService';

export const dashboardService = {
  // TODO: Replace mock implementation with real backend API when available: GET /api/v1/admin/dashboard/summary
  async getDashboardSummary(dateFrom?: string, dateTo?: string): Promise<DashboardSummaryResponse> {
    await new Promise((res) => setTimeout(res, 300));

    const rooms = await roomService.getRooms();
    const bookings = await bookingService.getReceptionistBookings();

    const roomCounts = {
      AVAILABLE: rooms.filter((r) => r.status === 'AVAILABLE').length,
      OCCUPIED: rooms.filter((r) => r.status === 'OCCUPIED').length,
      CLEANING: rooms.filter((r) => r.status === 'CLEANING').length,
      MAINTENANCE: rooms.filter((r) => r.status === 'MAINTENANCE').length,
    };

    const activeRooms = rooms.length - roomCounts.MAINTENANCE;
    const occupancyRate = activeRooms > 0 ? roomCounts.OCCUPIED / activeRooms : 0;

    // Expected revenue: Total value of CONFIRMED and CHECKED_IN bookings
    const expectedRevenue = bookings
      .filter((b) => ['CONFIRMED', 'CHECKED_IN'].includes(b.bookingStatus))
      .reduce((sum, b) => sum + b.totalAmount, 0);

    // Refunded total
    const refundTotal = bookings
      .filter((b) => b.paymentStatus === 'REFUNDED')
      .reduce((sum, b) => sum + (b.refundAmount || 0), 0);

    // Actual revenue: Actual amount paid minus refunded amounts
    const totalCollected = bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);
    const actualRevenue = Math.max(0, totalCollected - refundTotal);

    return {
      dateFrom: dateFrom || '2026-10-01',
      dateTo: dateTo || '2026-10-31',
      expectedRevenue,
      actualRevenue,
      refundTotal,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      roomCounts,
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter((b) => b.bookingStatus === 'CONFIRMED').length,
    };
  },
};
