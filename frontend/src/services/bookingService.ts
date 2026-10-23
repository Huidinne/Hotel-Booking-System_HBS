// =============================================================================
// HOTEL BOOKING SYSTEM - BOOKING SERVICE
// File: src/services/bookingService.ts
// Direct integration with Spring Boot /api/v1/bookings and
// /api/v1/receptionist/bookings endpoints.
// =============================================================================

import { apiClient } from './apiClient';
import {
  Booking,
  BookingFilterParams,
  CancelBookingRequest,
  CancelBookingResponse,
  CheckInRequest,
  CheckOutResponse,
  CreateBookingRequest,
  PaymentMethod,
} from '../types/booking';

function normalizeBooking(raw: any): Booking {
  const totalAmount = Number(raw.totalPrice ?? raw.totalAmount ?? 0);
  const depositAmount = Number(raw.depositAmount ?? Math.round(totalAmount * 0.5));
  const amountPaid = Number(
    raw.amountPaid ??
      (raw.paymentStatus === 'FULLY_PAID'
        ? totalAmount
        : raw.paymentStatus === 'PARTIALLY_PAID'
        ? depositAmount
        : 0)
  );

  const assignedRooms = Array.isArray(raw.assignedRooms)
    ? raw.assignedRooms.map((ar: any) => ({
        id: Number(ar.roomId || ar.id),
        roomNumber: ar.roomNumber,
        floor: Number(ar.floor),
      }))
    : undefined;

  return {
    id: Number(raw.id),
    bookingCode: raw.bookingCode,
    userId: Number(raw.userId || 0),
    customerName: raw.customerName || raw.user?.fullName || raw.fullName || 'Khách vãng lai',
    customerEmail: raw.customerEmail || raw.user?.email || raw.email || '',
    customerPhone: raw.customerPhone || raw.user?.phone || raw.phone || '',
    roomTypeId: Number(raw.roomTypeId),
    roomTypeName: raw.roomTypeName || 'Phòng cao cấp',
    quantity: Number(raw.quantity) || 1,
    guests: Number(raw.guests) || 2,
    checkIn: String(raw.checkIn).slice(0, 10),
    checkOut: String(raw.checkOut).slice(0, 10),
    unitPriceSnapshot: Number(raw.pricePerNight ?? raw.unitPriceSnapshot ?? 0),
    totalAmount,
    depositAmount,
    amountPaid,
    bookingStatus: raw.bookingStatus,
    paymentStatus: raw.paymentStatus,
    paymentMethod: raw.paymentMethod as PaymentMethod,
    holdExpiresAt: raw.holdExpiresAt || null,
    paymentUrl: raw.paymentUrl || null,
    note: raw.note || '',
    cancellationReason: raw.cancellationReason || null,
    cancelledAt: raw.cancelledAt || null,
    penaltyAmount: raw.penaltyAmount ? Number(raw.penaltyAmount) : undefined,
    refundAmount: raw.refundAmount ? Number(raw.refundAmount) : undefined,
    bankName: raw.bankName || null,
    bankAccountNumber: raw.accountNumber || raw.bankAccountNumber || null,
    bankAccountHolder: raw.accountHolder || raw.bankAccountHolder || null,
    assignedRooms,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

export const bookingService = {
  /**
   * Pure cancellation quote calculator conforming to SRS 2.6 & 8
   */
  calculateCancellationQuote(booking: Booking, cancelTime: Date = new Date()) {
    let standardCheckInTime: Date;
    try {
      if (booking.checkIn && booking.checkIn.includes('-')) {
        const [year, month, day] = booking.checkIn.split('-').map(Number);
        standardCheckInTime = new Date(year, month - 1, day, 14, 0, 0);
      } else {
        standardCheckInTime = new Date();
        standardCheckInTime.setDate(standardCheckInTime.getDate() + 1);
        standardCheckInTime.setHours(14, 0, 0, 0);
      }
    } catch {
      standardCheckInTime = new Date();
      standardCheckInTime.setDate(standardCheckInTime.getDate() + 1);
      standardCheckInTime.setHours(14, 0, 0, 0);
    }

    const diffMs = standardCheckInTime.getTime() - cancelTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    const standardDeposit = booking.depositAmount || Math.round((booking.totalAmount || 0) * 0.5) || 500000;
    const confirmedList: string[] = JSON.parse(localStorage.getItem('confirmed_bookings') || '[]');
    const isPaid =
      booking.paymentStatus === 'PARTIALLY_PAID' ||
      booking.paymentStatus === 'FULLY_PAID' ||
      (booking.amountPaid && booking.amountPaid > 0) ||
      confirmedList.includes(booking.bookingCode);

    const amountPaid =
      booking.amountPaid && booking.amountPaid > 0
        ? booking.amountPaid
        : standardDeposit;

    let penaltyRate = 0;
    let explanation = '';

    if (diffHours >= 24) {
      penaltyRate = 0.0;
      explanation = 'Hủy trước >= 24h so với 14:00 ngày nhận phòng: Hoàn 100% tiền cọc (Không mất phí).';
    } else if (diffHours >= 12 && diffHours < 24) {
      penaltyRate = 0.3;
      explanation = 'Hủy từ 12h đến dưới 24h trước 14:00 ngày nhận phòng: Phạt 30% tiền cọc, hoàn 70% cọc.';
    } else if (diffHours > 0 && diffHours < 12) {
      penaltyRate = 0.5;
      explanation = 'Hủy dưới 12h trước 14:00 ngày nhận phòng: Phạt 50% tiền cọc, hoàn 50% cọc.';
    } else {
      penaltyRate = 0.5;
      explanation = 'Hủy sát/sau 14:00 ngày nhận phòng: Khấu trừ 50% cọc, hỗ trợ hoàn lại 50% cọc cho khách hàng.';
    }

    const penaltyAmount = Math.round(standardDeposit * penaltyRate);
    let refundAmount = Math.max(0, amountPaid - penaltyAmount);
    if (refundAmount <= 0) {
      refundAmount = Math.round(standardDeposit * 0.5);
    }

    return {
      diffHours: Math.round(diffHours * 10) / 10,
      penaltyRate,
      penaltyAmount,
      refundAmount,
      explanation,
      standardCheckInTime: standardCheckInTime.toISOString(),
    };
  },

  /**
   * Create Booking: POST /api/v1/bookings
   */
  async createBooking(request: CreateBookingRequest, _userId?: number): Promise<Booking> {
    const payload = {
      roomTypeId: request.roomTypeId,
      quantity: request.quantity,
      guests: request.guests,
      checkIn: request.checkIn,
      checkOut: request.checkOut,
      paymentMethod: request.paymentMethod,
      note: request.note,
    };

    const raw = await apiClient.post<any>('/bookings', payload);
    return normalizeBooking(raw);
  },

  /**
   * Customer bookings: GET /api/v1/bookings/my-bookings
   */
  async getMyBookings(_userId?: number, filters?: BookingFilterParams): Promise<Booking[]> {
    const query = new URLSearchParams({
      page: '0',
      size: '50',
    });
    const data = await apiClient.get<any>(`/bookings/my-bookings?${query.toString()}`);

    const content = Array.isArray(data) ? data : data?.content || [];
    let list: Booking[] = content.map(normalizeBooking);
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((b) => b.bookingStatus === filters.status);
    }
    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
      list = list.filter((b) => b.paymentStatus === filters.paymentStatus);
    }
    return list;
  },

  /**
   * Detail by code: GET /api/v1/bookings/{bookingCode}
   */
  async getBookingByCode(bookingCode: string): Promise<Booking> {
    const data = await apiClient.get<any>(`/bookings/${bookingCode}`);
    if (!data) {
      throw new Error(`Không tìm thấy đơn đặt phòng với mã ${bookingCode}`);
    }
    return normalizeBooking(data);
  },

  /**
   * Receptionist bookings: GET /api/v1/receptionist/bookings
   */
  async getReceptionistBookings(filters?: BookingFilterParams): Promise<Booking[]> {
    const query = new URLSearchParams({
      page: '0',
      size: '50',
    });
    if (filters?.status && filters.status !== 'ALL') query.append('status', filters.status);
    if (filters?.checkInFrom) query.append('checkInFrom', filters.checkInFrom);
    if (filters?.checkInTo) query.append('checkInTo', filters.checkInTo);
    if (filters?.bookingCode) query.append('bookingCode', filters.bookingCode);
    if (filters?.customerEmail) query.append('customerEmail', filters.customerEmail);

    const data = await apiClient.get<any>(`/receptionist/bookings?${query.toString()}`);
    const content = Array.isArray(data) ? data : data?.content || [];
    let result: Booking[] = content.map(normalizeBooking);

    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
      result = result.filter((b) => b.paymentStatus === filters.paymentStatus);
    }
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(
        (b) =>
          b.bookingCode.toLowerCase().includes(term) ||
          b.customerName?.toLowerCase().includes(term) ||
          b.customerPhone?.includes(term) ||
          b.customerEmail?.toLowerCase().includes(term)
      );
    }
    return result;
  },

  /**
   * Receptionist confirm cash booking: PUT /api/v1/receptionist/bookings/{bookingId}/confirm
   */
  async confirmCashBooking(bookingId: number): Promise<Booking> {
    const raw = await apiClient.put<any>(`/receptionist/bookings/${bookingId}/confirm`);
    return normalizeBooking(raw);
  },

  /**
   * Receptionist check-in: POST /api/v1/receptionist/bookings/{bookingId}/check-in
   */
  async checkIn(bookingId: number, request: CheckInRequest): Promise<Booking> {
    const raw = await apiClient.post<any>(`/receptionist/bookings/${bookingId}/check-in`, request);
    return normalizeBooking(raw);
  },

  /**
   * Receptionist check-out: POST /api/v1/receptionist/bookings/{bookingId}/check-out
   */
  async checkOut(bookingId: number, _paymentMethod: PaymentMethod = 'CASH'): Promise<CheckOutResponse> {
    const raw = await apiClient.post<any>(`/receptionist/bookings/${bookingId}/check-out`);
    return {
      bookingCode: raw.bookingCode,
      bookingStatus: raw.bookingStatus || 'CHECKED_OUT',
      paymentStatus: raw.paymentStatus || 'FULLY_PAID',
      totalAmount: Number(raw.totalAmount || raw.totalPrice || 0),
      amountPaid: Number(raw.amountPaid || 0),
      remainingAmount: Number(raw.remainingAmount || 0),
      roomsToClean: raw.roomsToClean || [],
    };
  },

  /**
   * Receptionist mark no-show: POST /api/v1/receptionist/bookings/{bookingId}/no-show
   */
  async markNoShow(bookingId: number): Promise<Booking> {
    const raw = await apiClient.post<any>(`/receptionist/bookings/${bookingId}/no-show`);
    return normalizeBooking(raw);
  },

  /**
   * Cancel booking: POST /api/v1/bookings/{bookingCode}/cancel
   */
  async cancelBooking(bookingCode: string, request: CancelBookingRequest): Promise<CancelBookingResponse> {
    const raw = await apiClient.post<any>(`/bookings/${bookingCode}/cancel`, {
      reason: request.reason,
      bankName: request.bankName,
      accountNumber: request.accountNumber,
      accountHolder: request.accountHolder,
    });

    return {
      bookingCode: raw.bookingCode || bookingCode,
      bookingStatus: raw.bookingStatus || 'CANCELLED',
      paymentStatus: raw.paymentStatus || 'REFUND_PENDING',
      penaltyAmount: Number(raw.penaltyAmount || 0),
      refundAmount: Number(raw.refundAmount || 0),
      message: raw.message || 'Yêu cầu hủy phòng đã được xử lý thành công.',
    };
  },
};
