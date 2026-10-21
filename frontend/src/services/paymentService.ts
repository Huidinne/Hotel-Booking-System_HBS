// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - PAYMENT SERVICE
// File: src/services/paymentService.ts
// =============================================================================

import { ConfirmRefundRequest, RefundResponse } from '../types/payment';
import { bookingService } from './bookingService';

export const paymentService = {
  // TODO: Replace mock implementation with real backend API when available: GET /api/v1/receptionist/refunds
  async getPendingRefunds(): Promise<RefundResponse[]> {
    await new Promise((res) => setTimeout(res, 250));
    const allBookings = await bookingService.getReceptionistBookings({ paymentStatus: 'REFUND_PENDING' });

    return allBookings.map((b) => {
      const rawAcc = b.bankAccountNumber || '0000000000';
      const masked = rawAcc.length > 4 ? `******${rawAcc.slice(-4)}` : '******';

      return {
        bookingId: b.id,
        bookingCode: b.bookingCode,
        refundAmount: b.refundAmount || 0,
        paymentStatus: b.paymentStatus,
        bankName: b.bankName || 'Ngân hàng nhận',
        accountNumberMasked: masked,
        accountHolder: b.bankAccountHolder || b.customerName || 'NGUYEN VAN KHACH',
        cancellationReason: b.cancellationReason || '',
        cancelledAt: b.cancelledAt || b.updatedAt,
      };
    });
  },

  // TODO: Replace mock implementation with real backend API when available: POST /api/v1/receptionist/refunds/{bookingId}/confirm
  async confirmRefund(bookingId: number, request: ConfirmRefundRequest): Promise<void> {
    await new Promise((res) => setTimeout(res, 350));
    const bookings = await bookingService.getReceptionistBookings();
    const target = bookings.find((b) => b.id === Number(bookingId));
    if (!target) {
      throw new Error(`Không tìm thấy đơn hoàn tiền #${bookingId}`);
    }

    target.paymentStatus = 'REFUNDED';
    target.note = `${target.note || ''} | Đã hoàn tiền: ${request.referenceNote}`.trim();
    target.updatedAt = new Date().toISOString();
  },

  // TODO: Replace mock implementation with real backend API when available: GET /api/v1/payments/vnpay-return
  async processVNPayReturn(bookingCode: string, responseCode: string): Promise<boolean> {
    await new Promise((res) => setTimeout(res, 400));
    if (responseCode === '00') {
      await bookingService.markPaymentSuccess(bookingCode);
      return true;
    }
    return false;
  },
};
