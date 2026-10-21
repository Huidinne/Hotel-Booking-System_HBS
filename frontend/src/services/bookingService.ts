// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - BOOKING SERVICE
// File: src/services/bookingService.ts
// =============================================================================

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
import { MOCK_BOOKINGS } from '../mock/bookingMock';
import { roomService } from './roomService';

// In-memory state for bookings
let bookingsState: Booking[] = [...MOCK_BOOKINGS];

export const bookingService = {
  // Pure business logic calculator conforming to SRS 2.6 & 8
  calculateCancellationQuote(booking: Booking, cancelTime: Date = new Date()) {
    // Standard Check-in is 14:00 on checkIn date
    const [year, month, day] = booking.checkIn.split('-').map(Number);
    const standardCheckInTime = new Date(year, month - 1, day, 14, 0, 0);

    const diffMs = standardCheckInTime.getTime() - cancelTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    const standardDeposit = booking.depositAmount || booking.totalAmount * 0.5;
    const amountPaid = booking.amountPaid || 0;

    let penaltyRate = 0; // percentage of deposit
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
      penaltyRate = 1.0;
      explanation = 'Hủy tại hoặc sau 14:00 ngày nhận phòng: Phạt 100% tiền cọc. (Bảo lưu hoàn 100% phần thanh toán vượt cọc nếu có).';
    }

    const penaltyAmount = Math.round(standardDeposit * penaltyRate);
    // Customer protection principle: Refund = TotalPaid - Penalty
    const refundAmount = Math.max(0, amountPaid - penaltyAmount);

    return {
      diffHours: Math.round(diffHours * 10) / 10,
      penaltyRate,
      penaltyAmount,
      refundAmount,
      explanation,
      standardCheckInTime: standardCheckInTime.toISOString(),
    };
  },

  // TODO: Replace mock implementation with real backend API when available: POST /api/v1/bookings
  async createBooking(request: CreateBookingRequest, userId: number = 3): Promise<Booking> {
    await new Promise((res) => setTimeout(res, 350));

    const roomType = await roomService.getRoomTypeById(request.roomTypeId);

    // Calculate nights
    const start = new Date(request.checkIn);
    const end = new Date(request.checkOut);
    const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const quantity = Number(request.quantity) || 1;
    const unitPriceSnapshot = roomType.basePrice;
    const totalAmount = unitPriceSnapshot * nights * quantity;
    const depositAmount = Math.round(totalAmount * 0.5); // 50% standard deposit

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const bookingCode = `BK-${dateStr}-${randomSuffix}`;

    // Hold time rule
    let holdExpiresAt: string | null = null;
    let paymentUrl: string | null = null;

    if (request.paymentMethod === 'VNPAY') {
      const expires = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins
      holdExpiresAt = expires.toISOString();
      paymentUrl = `/payment/vnpay-return?vnp_TxnRef=${bookingCode}&vnp_Amount=${depositAmount}&vnp_ResponseCode=00`;
    } else {
      // CASH: 24h hold
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      holdExpiresAt = expires.toISOString();
    }

    const newBooking: Booking = {
      id: Date.now(),
      bookingCode,
      userId,
      customerName: request.customerName || 'Khách hàng',
      customerEmail: request.customerEmail || 'customer@example.com',
      customerPhone: request.customerPhone || '0900000000',
      roomTypeId: roomType.id,
      roomTypeName: roomType.name,
      quantity,
      guests: request.guests,
      checkIn: request.checkIn,
      checkOut: request.checkOut,
      unitPriceSnapshot,
      totalAmount,
      depositAmount,
      amountPaid: 0,
      bookingStatus: 'PENDING',
      paymentStatus: 'UNPAID',
      paymentMethod: request.paymentMethod,
      holdExpiresAt,
      paymentUrl,
      note: request.note || '',
      createdAt: now.toISOString(),
    };

    bookingsState.unshift(newBooking);
    return newBooking;
  },

  // TODO: Replace mock implementation with real backend API when available: GET /api/v1/bookings/my-bookings
  async getMyBookings(userId: number, filters?: BookingFilterParams): Promise<Booking[]> {
    await new Promise((res) => setTimeout(res, 250));
    let result = bookingsState.filter((b) => b.userId === Number(userId));

    if (filters?.status && filters.status !== 'ALL') {
      result = result.filter((b) => b.bookingStatus === filters.status);
    }
    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
      result = result.filter((b) => b.paymentStatus === filters.paymentStatus);
    }

    return result;
  },

  // TODO: Replace mock implementation with real backend API when available: GET /api/v1/bookings/{bookingCode}
  async getBookingByCode(bookingCode: string): Promise<Booking> {
    await new Promise((res) => setTimeout(res, 200));
    const booking = bookingsState.find((b) => b.bookingCode === bookingCode);
    if (!booking) {
      throw new Error(`Không tìm thấy đơn đặt phòng với mã ${bookingCode}`);
    }
    return { ...booking };
  },

  // TODO: Replace mock implementation with real backend API when available: GET /api/v1/receptionist/bookings
  async getReceptionistBookings(filters?: BookingFilterParams): Promise<Booking[]> {
    await new Promise((res) => setTimeout(res, 250));
    let result = [...bookingsState];

    if (filters?.status && filters.status !== 'ALL') {
      result = result.filter((b) => b.bookingStatus === filters.status);
    }
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

  // TODO: Replace mock implementation with real backend API when available: PUT /api/v1/receptionist/bookings/{bookingId}/confirm
  async confirmCashBooking(bookingId: number): Promise<Booking> {
    await new Promise((res) => setTimeout(res, 300));
    const index = bookingsState.findIndex((b) => b.id === Number(bookingId));
    if (index === -1) throw new Error('Không tìm thấy booking');

    bookingsState[index] = {
      ...bookingsState[index],
      bookingStatus: 'CONFIRMED',
      updatedAt: new Date().toISOString(),
    };

    return { ...bookingsState[index] };
  },

  // TODO: Replace mock implementation with real backend API when available: POST /api/v1/receptionist/bookings/{bookingId}/check-in
  async checkIn(bookingId: number, request: CheckInRequest): Promise<Booking> {
    await new Promise((res) => setTimeout(res, 350));
    const index = bookingsState.findIndex((b) => b.id === Number(bookingId));
    if (index === -1) throw new Error('Không tìm thấy booking');

    const booking = bookingsState[index];
    if (booking.bookingStatus !== 'CONFIRMED') {
      throw new Error('Chỉ đơn đặt phòng ở trạng thái ĐÃ XÁC NHẬN (CONFIRMED) mới được phép Check-in!');
    }

    if (request.assignedRoomIds.length !== booking.quantity) {
      throw new Error(`Vui lòng chọn đúng ${booking.quantity} phòng vật lý tương ứng với số lượng đặt.`);
    }

    // Update physical rooms status to OCCUPIED
    const allRooms = await roomService.getRooms();
    const assignedRoomsInfo: { id: number; roomNumber: string; floor: number }[] = [];

    for (const rId of request.assignedRoomIds) {
      const targetRoom = allRooms.find((r) => r.id === rId);
      if (!targetRoom || targetRoom.status !== 'AVAILABLE') {
        throw new Error(`Phòng ${targetRoom?.roomNumber || rId} hiện không sẵn sàng để nhận.`);
      }
      await roomService.updateRoomStatus(rId, 'OCCUPIED');
      assignedRoomsInfo.push({
        id: targetRoom.id,
        roomNumber: targetRoom.roomNumber,
        floor: targetRoom.floor,
      });
    }

    bookingsState[index] = {
      ...booking,
      bookingStatus: 'CHECKED_IN',
      assignedRooms: assignedRoomsInfo,
      updatedAt: new Date().toISOString(),
    };

    return { ...bookingsState[index] };
  },

  // TODO: Replace mock implementation with real backend API when available: POST /api/v1/receptionist/bookings/{bookingId}/check-out
  async checkOut(bookingId: number, paymentMethod: PaymentMethod = 'CASH'): Promise<CheckOutResponse> {
    await new Promise((res) => setTimeout(res, 350));
    const index = bookingsState.findIndex((b) => b.id === Number(bookingId));
    if (index === -1) throw new Error('Không tìm thấy booking');

    const booking = bookingsState[index];
    if (booking.bookingStatus !== 'CHECKED_IN') {
      throw new Error('Chỉ đơn đang ở (CHECKED_IN) mới có thể thực hiện trả phòng (Check-out)!');
    }

    const totalAmount = booking.totalAmount;
    const amountPaid = totalAmount; // Reconcile 100%
    const roomsToClean: number[] = [];

    // Switch all assigned physical rooms to CLEANING
    if (booking.assignedRooms) {
      for (const r of booking.assignedRooms) {
        await roomService.updateRoomStatus(r.id, 'CLEANING');
        roomsToClean.push(r.id);
      }
    }

    bookingsState[index] = {
      ...booking,
      bookingStatus: 'CHECKED_OUT',
      paymentStatus: 'FULLY_PAID',
      amountPaid,
      updatedAt: new Date().toISOString(),
    };

    return {
      bookingCode: booking.bookingCode,
      bookingStatus: 'CHECKED_OUT',
      paymentStatus: 'FULLY_PAID',
      totalAmount,
      amountPaid,
      remainingAmount: 0,
      roomsToClean,
    };
  },

  // TODO: Replace mock implementation with real backend API when available: POST /api/v1/receptionist/bookings/{bookingId}/no-show
  async markNoShow(bookingId: number): Promise<Booking> {
    await new Promise((res) => setTimeout(res, 300));
    const index = bookingsState.findIndex((b) => b.id === Number(bookingId));
    if (index === -1) throw new Error('Không tìm thấy booking');

    const booking = bookingsState[index];
    if (booking.bookingStatus !== 'CONFIRMED') {
      throw new Error('Chỉ có thể đánh dấu No-Show đối với đơn CONFIRMED.');
    }

    const standardDeposit = booking.depositAmount;
    let paymentStatus = booking.paymentStatus;
    let refundAmount = 0;

    // Rule: if paid 100%, refund remaining 50% for unused nights
    if (booking.amountPaid > standardDeposit) {
      refundAmount = booking.amountPaid - standardDeposit;
      paymentStatus = 'REFUND_PENDING';
    }

    bookingsState[index] = {
      ...booking,
      bookingStatus: 'NO_SHOW',
      paymentStatus,
      refundAmount,
      updatedAt: new Date().toISOString(),
    };

    return { ...bookingsState[index] };
  },

  // TODO: Replace mock implementation with real backend API when available: POST /api/v1/bookings/{bookingCode}/cancel
  async cancelBooking(bookingCode: string, request: CancelBookingRequest): Promise<CancelBookingResponse> {
    await new Promise((res) => setTimeout(res, 350));
    const index = bookingsState.findIndex((b) => b.bookingCode === bookingCode);
    if (index === -1) throw new Error(`Không tìm thấy booking #${bookingCode}`);

    const booking = bookingsState[index];

    // STRICT CHECK: Block cancellation if CHECKED_IN, CHECKED_OUT, NO_SHOW, CANCELLED
    if (['CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED'].includes(booking.bookingStatus)) {
      throw new Error(
        `Không thể tự hủy đơn đặt phòng đang ở trạng thái ${booking.bookingStatus}. Vui lòng liên hệ lễ tân để được xử lý trực tiếp!`
      );
    }

    const quote = this.calculateCancellationQuote(booking);

    let paymentStatus = booking.paymentStatus;
    if (quote.refundAmount > 0) {
      paymentStatus = 'REFUND_PENDING';
    } else {
      paymentStatus = booking.amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
    }

    bookingsState[index] = {
      ...booking,
      bookingStatus: 'CANCELLED',
      paymentStatus,
      penaltyAmount: quote.penaltyAmount,
      refundAmount: quote.refundAmount,
      cancellationReason: request.reason,
      cancelledAt: new Date().toISOString(),
      bankName: request.bankName || null,
      bankAccountNumber: request.accountNumber || null,
      bankAccountHolder: request.accountHolder || null,
      updatedAt: new Date().toISOString(),
    };

    return {
      bookingCode: booking.bookingCode,
      bookingStatus: 'CANCELLED',
      paymentStatus,
      penaltyAmount: quote.penaltyAmount,
      refundAmount: quote.refundAmount,
      message: 'Yêu cầu hủy phòng đã được xử lý thành công theo quy định.',
    };
  },

  // Simulate VNPay payment success for a booking
  async markPaymentSuccess(bookingCode: string): Promise<Booking> {
    const index = bookingsState.findIndex((b) => b.bookingCode === bookingCode);
    if (index === -1) throw new Error('Không tìm thấy booking');

    const booking = bookingsState[index];
    bookingsState[index] = {
      ...booking,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PARTIALLY_PAID',
      amountPaid: booking.depositAmount,
      holdExpiresAt: null,
      updatedAt: new Date().toISOString(),
    };

    return { ...bookingsState[index] };
  },
};
